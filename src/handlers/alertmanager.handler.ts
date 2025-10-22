import { Request, Response } from 'express';
import { AlertmanagerWebhook, Alert } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { MCPKubernetesServer } from '../mcp/mcp-server';

export class AlertmanagerHandler {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private provider: string;
  private mcpServer: MCPKubernetesServer;

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'anthropic';
    this.mcpServer = new MCPKubernetesServer();

    if (this.provider === 'anthropic') {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    } else if (this.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const webhook: AlertmanagerWebhook = req.body;

      for (const alert of webhook.alerts) {
        if (alert.status !== 'firing') continue;

        // Process alert with MCP in background
        this.processAlertWithMCP(alert).catch((err) => {
          console.error('Error processing alert:', err);
        });
      }

      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Alertmanager webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async processAlertWithMCP(alert: Alert) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[ALERT] Processing: ${alert.labels.alertname}`);
    console.log(`${'='.repeat(80)}\n`);

    const context = this.buildAlertContext(alert);
    const slackChannel = process.env.SLACK_CHANNEL || '#eks-alerts';

    const systemPrompt = `You are a Kubernetes SRE expert. An alert has fired and you need to investigate and resolve it.

**Your Mission:**
1. Investigate the issue thoroughly using kubectl tools
2. Determine the root cause
3. Recommend 3 concrete remediation actions
4. Report findings to Slack

**Available Tools:**
- kubectl_* tools: Inspect cluster state (get_pods, describe_pod, get_logs, top_pods, etc.)
- slack_send_alert: Send final report with remediation buttons

**Investigation Strategy:**
1. Start with broad context (kubectl_get_pods, kubectl_get_events)
2. Drill down into specifics (kubectl_describe_pod, kubectl_get_logs)
3. Check resources if needed (kubectl_top_pods, kubectl_top_nodes)
4. Review previous logs for crashes (kubectl_get_previous_logs)
5. Don't stop at 3 commands - investigate until you understand the issue

**Remediation Guidelines:**
- Suggest 3 actions from safest to most aggressive
- Prefer read-only diagnostics first if root cause unclear
- For crashes: restart pod, check resources, review config
- For resource issues: scale up, adjust limits, check node capacity
- For node issues: cordon node, check system resources, drain if needed

**Important:**
- Call as many tools as needed (10, 20, 50+ if necessary)
- Only call slack_send_alert ONCE at the very end
- Be thorough but efficient
- Explain your reasoning

**Alert Details:**
${context}

**Slack Channel for Report:** ${slackChannel}

Begin your investigation now. Remember: investigate thoroughly, then report once at the end.`;

    try {
      if (this.provider === 'anthropic') {
        await this.runWithAnthropic(systemPrompt);
      } else if (this.provider === 'openai') {
        await this.runWithOpenAI(systemPrompt);
      }
    } catch (error) {
      console.error('[ALERT] Processing failed:', error);
      // Send error notification
      await this.mcpServer.executeTool('slack_send_message', {
        channel: slackChannel,
        text: `⚠️ Failed to process alert ${alert.labels.alertname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[ALERT] Completed: ${alert.labels.alertname}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  private async runWithAnthropic(systemPrompt: string) {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: systemPrompt }];

    let iteration = 0;
    const maxIterations = 50; // Safety limit

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n[LLM] Iteration ${iteration}/${maxIterations}`);

      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages,
        tools: this.mcpServer.getTools().map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: {
            type: 'object' as const,
            properties: tool.inputSchema.properties || {},
            required: tool.inputSchema.required || [],
          },
        })),
      });

      // Add assistant response
      messages.push({ role: 'assistant', content: response.content });

      // Check for tool use
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        console.log('[LLM] No more tools to use - investigation complete');
        break;
      }

      console.log(`[LLM] Calling ${toolUseBlocks.length} tool(s):`);
      toolUseBlocks.forEach((t) => console.log(`  - ${t.name}`));

      // Execute all tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`\n[TOOL] Executing: ${toolUse.name}`);
        console.log(`[TOOL] Arguments:`, JSON.stringify(toolUse.input, null, 2));

        try {
          const result = await this.mcpServer.executeTool(
            toolUse.name,
            toolUse.input as Record<string, any>
          );

          console.log(
            `[TOOL] Result (${result.length} chars):`,
            result.length > 200 ? result.substring(0, 200) + '...' : result
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[TOOL] Error:`, errorMsg);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${errorMsg}`,
            is_error: true,
          });
        }
      }

      // Add tool results to messages
      messages.push({ role: 'user', content: toolResults });
    }

    if (iteration >= maxIterations) {
      console.warn('[LLM] Reached maximum iterations - forcing completion');
    }
  }

  private async runWithOpenAI(systemPrompt: string) {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    let iteration = 0;
    const maxIterations = 50;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n[LLM] Iteration ${iteration}/${maxIterations}`);

      const response = await this.openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
        tools: this.mcpServer.getTools().map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        console.log('[LLM] No more tools to use - investigation complete');
        break;
      }

      console.log(`[LLM] Calling ${message.tool_calls.length} tool(s):`);
      message.tool_calls.forEach((t) => console.log(`  - ${t.function.name}`));

      // Execute tool calls
      for (const toolCall of message.tool_calls) {
        console.log(`\n[TOOL] Executing: ${toolCall.function.name}`);

        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[TOOL] Arguments:`, JSON.stringify(args, null, 2));

          const result = await this.mcpServer.executeTool(toolCall.function.name, args);

          console.log(
            `[TOOL] Result (${result.length} chars):`,
            result.length > 200 ? result.substring(0, 200) + '...' : result
          );

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[TOOL] Error:`, errorMsg);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: ${errorMsg}`,
          });
        }
      }
    }

    if (iteration >= maxIterations) {
      console.warn('[LLM] Reached maximum iterations - forcing completion');
    }
  }

  private buildAlertContext(alert: Alert): string {
    return `Alert Name: ${alert.labels.alertname}
Severity: ${alert.labels.severity}
Namespace: ${alert.labels.namespace || 'N/A'}
Pod: ${alert.labels.pod || 'N/A'}
Node: ${alert.labels.node || 'N/A'}
Container: ${alert.labels.container || 'N/A'}
Instance: ${alert.labels.instance || 'N/A'}
Summary: ${alert.annotations.summary || 'N/A'}
Description: ${alert.annotations.description || 'N/A'}
All Labels: ${JSON.stringify(alert.labels, null, 2)}
All Annotations: ${JSON.stringify(alert.annotations, null, 2)}`;
  }
}

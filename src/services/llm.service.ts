import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { LLMProvider, CommandAction, Alert } from '../types';

export class LLMService {
  private provider: LLMProvider;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private ollamaUrl: string;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as LLMProvider) || 'anthropic';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    switch (this.provider) {
      case 'anthropic':
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        break;
      case 'openai':
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        break;
      case 'gemini':
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        break;
    }
  }

  /**
   * STEP 1: Ask LLM what diagnostic commands to run
   */
  async suggestDiagnosticCommands(alert: Alert): Promise<CommandAction[]> {
    const context = this.buildAlertContext(alert);
    
    const prompt = `You are a Kubernetes expert. An alert has fired with the following details:

${context}

Based on this alert, suggest exactly 3 kubectl commands to diagnose the issue. These should be READ-ONLY diagnostic commands.

Available command types:
- get_pods (list pods in namespace)
- describe_pod (detailed pod info)
- get_logs (current logs)
- get_previous_logs (logs from previous container)
- get_events (recent events)
- get_deployment (deployment status)
- get_statefulset (statefulset status)
- get_nodes (node status)
- describe_node (detailed node info)
- get_hpa (HPA status)
- top_nodes (node resource usage)
- top_pods (pod resource usage)
- get_pvc (PVC status)
- get_service (service status)

Respond with JSON array of exactly 3 commands in this format:
[
  {
    "type": "command_type",
    "label": "Short description for button",
    "params": {"namespace": "value", "name": "value"}
  }
]

Only return valid JSON, no explanation.`;

    try {
      const response = await this.callLLM(prompt);
      const commands = JSON.parse(this.extractJSON(response));
      return commands.slice(0, 3);
    } catch (error) {
      console.error('Error getting diagnostic commands:', error);
      // Fallback to basic commands
      return this.getFallbackCommands(alert);
    }
  }

  /**
   * STEP 2: Analyze command outputs and suggest remediation
   */
  async analyzeAndSuggestRemediation(
    alert: Alert,
    commandOutputs: { command: string; output: string }[]
  ): Promise<{
    rootCause: string;
    remediationCommands: CommandAction[];
  }> {
    const context = this.buildAlertContext(alert);
    
    const outputsText = commandOutputs
      .map(co => `Command: ${co.command}\nOutput:\n${co.output}\n---`)
      .join('\n\n');

    const prompt = `You are a Kubernetes expert analyzing a production issue.

ALERT DETAILS:
${context}

DIAGNOSTIC COMMAND OUTPUTS:
${outputsText}

Based on the alert and diagnostic data above:

1. Identify the ROOT CAUSE of the issue (2-3 sentences)
2. Suggest exactly 3 REMEDIATION actions as kubectl commands

For remediation commands, you can suggest:
READ OPERATIONS (safe):
- get_pods, describe_pod, get_logs, get_events, etc.

WRITE OPERATIONS (if necessary):
- restart_pod (delete pod to restart)
- scale_deployment (scale up/down)
- cordon_node (mark node unschedulable)
- drain_node (safely evict pods from node)

Respond with JSON in this exact format:
{
  "rootCause": "Clear explanation of what went wrong and why",
  "remediationCommands": [
    {
      "type": "command_type",
      "label": "Action description",
      "params": {"namespace": "value", "name": "value"}
    }
  ]
}

Only return valid JSON, no explanation.`;

    try {
      const response = await this.callLLM(prompt);
      const analysis = JSON.parse(this.extractJSON(response));
      return {
        rootCause: analysis.rootCause,
        remediationCommands: analysis.remediationCommands.slice(0, 3)
      };
    } catch (error) {
      console.error('Error analyzing outputs:', error);
      return {
        rootCause: 'Unable to determine root cause. Manual investigation required.',
        remediationCommands: this.getFallbackCommands(alert)
      };
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    switch (this.provider) {
      case 'anthropic':
        return await this.callAnthropic(prompt);
      case 'openai':
        return await this.callOpenAI(prompt);
      case 'gemini':
        return await this.callGemini(prompt);
      case 'ollama':
        return await this.callOllama(prompt);
      default:
        throw new Error('LLM provider not configured');
    }
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const message = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });
    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const completion = await this.openai!.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    });
    return completion.choices[0]?.message?.content || '';
  }

  private async callGemini(prompt: string): Promise<string> {
    const model = this.gemini!.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private async callOllama(prompt: string): Promise<string> {
    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  }

  private extractJSON(text: string): string {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON object or array
    const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

  private buildAlertContext(alert: Alert): string {
    return `Alert Name: ${alert.labels.alertname}
Severity: ${alert.labels.severity}
Namespace: ${alert.labels.namespace || 'N/A'}
Pod: ${alert.labels.pod || 'N/A'}
Node: ${alert.labels.node || 'N/A'}
Instance: ${alert.labels.instance || 'N/A'}
Summary: ${alert.annotations.summary || 'N/A'}
Description: ${alert.annotations.description || 'N/A'}
All Labels: ${JSON.stringify(alert.labels, null, 2)}`;
  }

  private getFallbackCommands(alert: Alert): CommandAction[] {
    const namespace = alert.labels.namespace || 'default';
    const podName = alert.labels.pod;

    return [
      { 
        type: 'get_pods', 
        label: '📦 List Pods', 
        params: { namespace } 
      },
      { 
        type: 'get_events', 
        label: '⚡ Get Recent Events', 
        params: { namespace } 
      },
      podName 
        ? { type: 'describe_pod', label: '🔍 Describe Pod', params: { namespace, name: podName } }
        : { type: 'get_nodes', label: '🖥️ Check Nodes', params: {} }
    ];
  }
}
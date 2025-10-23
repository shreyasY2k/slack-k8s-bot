import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { KubernetesService } from '../services/kubernetes.service.js';
import { SlackService } from '../services/slack.service.js';
import { getKubectlTools } from './tools/kubectl.tools.js';
import { getSlackTools } from './tools/slack.tools.js';

export class MCPKubernetesServer {
  private server: Server;
  private k8sService: KubernetesService;
  private slackService: SlackService;
  private allTools: Tool[];

  constructor() {
    this.k8sService = new KubernetesService();
    this.slackService = new SlackService();
    
    // Combine all tools
    this.allTools = [
      ...getKubectlTools(),
      ...getSlackTools()
    ];
    
    this.server = new Server(
      {
        name: 'kubernetes-diagnostics-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log(`[MCP] Listing ${this.allTools.length} tools`);
      return {
        tools: this.allTools,
      };
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.log(`[MCP] Executing tool: ${name} with args:`, JSON.stringify(args, null, 2));

      try {
        let result: string;

        // Route to appropriate service
        if (name.startsWith('kubectl_')) {
          result = await this.handleKubectlTool(name, args as Record<string, any>);
        } else if (name.startsWith('slack_')) {
          result = await this.handleSlackTool(name, args as Record<string, any>);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }

        console.log(`[MCP] Tool ${name} completed successfully`);

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[MCP] Tool ${name} failed:`, errorMessage);

        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleKubectlTool(name: string, args: Record<string, any>): Promise<string> {
    // Convert tool name to command type
    const commandType = name.replace('kubectl_', '');
    
    // Map some tool names to command types
    const commandMap: Record<string, string> = {
      'restart_pod': 'restart_pod',
      'scale_deployment': 'scale_deployment',
      'cordon_node': 'cordon_node',
      'uncordon_node': 'uncordon_node',
      'list_pvc': 'list_pvc',
      'get_pod_resources': 'get_pod_resources',
    };

    const actualCommand = commandMap[commandType] || commandType;
    
    return await this.k8sService.executeCommand(actualCommand, args);
  }

  private async handleSlackTool(name: string, args: Record<string, any>): Promise<string> {
    switch (name) {
      case 'slack_send_message':
        await this.slackService.sendRichMessage(
          args.channel,
          args.text,
          args.blocks
        );
        return `Message sent to ${args.channel}`;
      
      case 'slack_send_alert':
        await this.slackService.sendAlertMessage(
          args.channel,
          args.alertName,
          args.severity,
          args.rootCause,
          args.diagnosticSummary,
          args.remediationButtons
        );
        return `Alert message sent to ${args.channel}`;
      
      default:
        throw new Error(`Unknown Slack tool: ${name}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[MCP] Kubernetes Diagnostics Server running on stdio');
  }

  // For HTTP mode (used by alert handler)
  getTools(): Tool[] {
    return this.allTools;
  }

  async executeTool(name: string, args: Record<string, any>): Promise<string> {
    if (name.startsWith('kubectl_')) {
      return await this.handleKubectlTool(name, args);
    } else if (name.startsWith('slack_')) {
      return await this.handleSlackTool(name, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
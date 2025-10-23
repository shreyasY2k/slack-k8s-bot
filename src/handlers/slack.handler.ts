import { Request, Response } from 'express';
import { MCPKubernetesServer } from '../mcp/mcp-server.js';
import { SlackService } from '../services/slack.service.js';

export class SlackHandler {
  private mcpServer: MCPKubernetesServer;
  private slackService: SlackService;

  constructor() {
    this.mcpServer = new MCPKubernetesServer();
    this.slackService = new SlackService();
  }

  async handleInteractivity(req: Request, res: Response) {
    try {
      const payload = JSON.parse(req.body.payload);
      const action = payload.actions[0];
      const commandData = JSON.parse(action.value);

      console.log(`[SLACK] User clicked: ${action.text.text}`);
      console.log(`[SLACK] Executing: ${commandData.command}`);

      // Execute command
      const result = await this.mcpServer.executeTool(
        commandData.command,
        commandData.params
      );

      // Reply in thread
      await this.slackService.replyInThread(
        payload.channel.id,
        payload.message.ts,
        `*Action:* ${action.text.text}\n*Result:*\n\`\`\`${result.slice(0, 3000)}\`\`\``
      );

      res.json({ response_action: 'update' });
    } catch (error) {
      console.error('[SLACK] Interactivity error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
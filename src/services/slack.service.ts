import { WebClient } from '@slack/web-api';

export class SlackService {
  private client: WebClient;
  private channel: string;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.channel = process.env.SLACK_CHANNEL || '#eks-alerts';
  }

  async sendRichMessage(channel: string, text: string, blocks?: any[]) {
    await this.client.chat.postMessage({
      channel,
      text,
      blocks,
    });
  }

  async sendAlertMessage(
    channel: string,
    alertName: string,
    severity: string,
    rootCause: string,
    diagnosticSummary: string,
    remediationButtons: Array<{ label: string; command: string; params: Record<string, any> }>,
    namespace?: string,
    pod?: string
  ) {
    const emoji = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${alertName}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:*\n${severity}` },
          { type: 'mrkdwn', text: `*Namespace:*\n${namespace || 'N/A'}` },
          ...(pod ? [{ type: 'mrkdwn', text: `*Pod:*\n${pod}` }] : []),
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔍 Root Cause:*\n${rootCause}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Diagnostic Summary:*\n${diagnosticSummary}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🛠️ Recommended Actions:*',
        },
      },
      {
        type: 'actions',
        elements: remediationButtons.slice(0, 3).map((btn, i) => {
          const isDestructive = btn.command.includes('restart') || 
                                 btn.command.includes('scale') || 
                                 btn.command.includes('delete') ||
                                 btn.command.includes('cordon');

          return {
            type: 'button',
            text: { type: 'plain_text', text: btn.label },
            action_id: `remediate_${i}`,
            value: JSON.stringify({ command: btn.command, params: btn.params }),
            style: i === 0 ? 'primary' : 'default',
            confirm: isDestructive
              ? {
                  title: { type: 'plain_text', text: 'Confirm Action' },
                  text: { type: 'plain_text', text: `Execute: ${btn.label}?` },
                  confirm: { type: 'plain_text', text: 'Execute' },
                  deny: { type: 'plain_text', text: 'Cancel' },
                }
              : undefined,
          };
        }),
      },
    ];

    await this.client.chat.postMessage({
      channel,
      blocks,
      text: `${alertName}: ${rootCause}`,
    });
  }

  async replyInThread(channel: string, threadTs: string, message: string) {
    await this.client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: message,
    });
  }
}
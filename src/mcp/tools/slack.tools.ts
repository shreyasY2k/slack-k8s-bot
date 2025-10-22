import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getSlackTools(): Tool[] {
  return [
    {
      name: 'slack_send_message',
      description: 'Send a simple text message to Slack. Use this for status updates or simple notifications.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            description: 'Slack channel (e.g., "#alerts", "#incidents")',
          },
          text: {
            type: 'string',
            description: 'Message text',
          },
        },
        required: ['channel', 'text'],
      },
    },
    {
      name: 'slack_send_alert',
      description: 'Send a rich formatted alert message with diagnostic summary and interactive remediation buttons. Use this as the FINAL step after investigation to present findings to humans.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            description: 'Slack channel',
          },
          alertName: {
            type: 'string',
            description: 'Name of the alert (e.g., "KubePodCrashLooping")',
          },
          severity: {
            type: 'string',
            description: 'Severity level: "critical", "warning", or "info"',
          },
          namespace: {
            type: 'string',
            description: 'Affected namespace',
          },
          pod: {
            type: 'string',
            description: 'Affected pod name (optional)',
          },
          rootCause: {
            type: 'string',
            description: 'Clear explanation of the root cause (2-3 sentences)',
          },
          diagnosticSummary: {
            type: 'string',
            description: 'Brief summary of diagnostic findings',
          },
          remediationButtons: {
            type: 'array',
            description: 'Array of 3 remediation actions as buttons',
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description: 'Button text (e.g., "Restart Pod", "Scale to 3 replicas")',
                },
                command: {
                  type: 'string',
                  description: 'kubectl tool name (e.g., "kubectl_restart_pod")',
                },
                params: {
                  type: 'object',
                  description: 'Parameters for the command',
                },
              },
            },
          },
        },
        required: ['channel', 'alertName', 'severity', 'rootCause', 'diagnosticSummary', 'remediationButtons'],
      },
    },
  ];
}
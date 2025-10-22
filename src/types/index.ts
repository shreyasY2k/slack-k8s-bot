export interface Alert {
  status: string;
  labels: {
    alertname: string;
    severity: string;
    namespace?: string;
    instance?: string;
    pod?: string;
    node?: string;
    container?: string;
    deployment?: string;
    statefulset?: string;
    job?: string;
    [key: string]: string | undefined;
  };
  annotations: {
    summary?: string;
    description?: string;
    runbook_url?: string;
    [key: string]: string | undefined;
  };
  startsAt?: string;
  endsAt?: string;
  generatorURL?: string;
  fingerprint?: string;
}

export interface AlertmanagerWebhook {
  receiver: string;
  status: string;
  alerts: Alert[];
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
  version: string;
  groupKey: string;
  truncatedAlerts?: number;
}

export interface CommandAction {
  type: string;
  label: string;
  params: Record<string, any>;
}

export interface LLMAnalysis {
  analysis: string;
  commands: CommandAction[];
}

export type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama';

export interface SlackBlock {
  type: string;
  [key: string]: any;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
}
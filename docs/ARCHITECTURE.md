# Architecture

## System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                          │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │  Prometheus  │────>│ Alertmanager │────>│ Slack K8s Bot│     │
│  │              │     │              │     │              │     │
│  └──────────────┘     └──────────────┘     └──────────────┘     │
│         │                                          │            │
│         │                                          │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                         ┌──────────────┐      │
│  │ kube-state-  │                         │   Slack API  │      │
│  │   metrics    │                         │              │      │
│  └──────────────┘                         └──────────────┘      │
│         │                                          │            │
│         │                                          │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                         ┌──────────────┐      │
│  │   kubelet    │                         │  LLM (Claude │      │
│  │              │                         │  GPT/Gemini) │      │
│  └──────────────┘                         └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Alert Flow
- **Prometheus**: Scrapes metrics, evaluates rules, fires alerts
- **Alertmanager**: Routes alerts, groups, deduplicates
- **Slack K8s Bot**: Receives webhooks, processes alerts

### 2. MCP Server
- Exposes 20+ kubectl tools to LLM
- Handles tool execution via Kubernetes API
- Provides Slack messaging capabilities

### 3. LLM Agent
- Receives alert context
- Iteratively calls MCP tools
- Determines root cause
- Suggests remediation

### 4. Slack Integration
- Sends rich formatted messages
- Provides interactive buttons
- Executes remediation commands

## Data Flow

1. **Alert Trigger**: Metric threshold exceeded
2. **Alert Evaluation**: Prometheus evaluates rule
3. **Alert Routing**: Alertmanager sends webhook
4. **MCP Investigation**: LLM calls kubectl tools iteratively
5. **Root Cause Analysis**: LLM analyzes outputs
6. **Slack Notification**: Rich message with buttons
7. **User Action**: Click button to execute remediation

## Security Model

### RBAC Permissions
- **Read**: All cluster resources
- **Write**: Limited to pod restart, deployment scale, node cordon

### API Authentication
- ServiceAccount token auto-mounted
- TLS verification enabled
- Rate limiting on LLM calls

### Secret Management
- Kubernetes secrets for API keys
- No secrets in logs
- Secure webhook validation
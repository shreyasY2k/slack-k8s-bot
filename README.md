# Slack K8s Bot with MCP

AI-powered Kubernetes alert diagnosis and remediation bot using Model Context Protocol (MCP).

## Features

- 🤖 **Autonomous Investigation**: LLM iteratively calls kubectl commands until root cause is found
- 🔧 **No Arbitrary Limits**: Can execute 10, 20, 50+ commands as needed
- 🧠 **Multi-LLM Support**: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), Llama (Ollama)
- 📊 **Rich Diagnostics**: Comprehensive cluster inspection via MCP tools
- 🛠️ **Interactive Remediation**: Slack buttons for one-click fixes
- 🔒 **RBAC Security**: Fine-grained permissions for read and write operations
- 📦 **Helm Deployment**: Easy installation with Alertmanager dependency

## Quick Start

### 1. Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
- kubectl configured
- Helm 3.x
- Slack workspace with bot token
- LLM API key (Anthropic, OpenAI, or Google)

### 2. Create Slack App

1. Go to https://api.slack.com/apps
2. Create new app
3. Enable:
   - **Bot Token Scopes**: `chat:write`, `chat:write.public`, `commands`
   - **Interactivity**: Enable and set URL to `https://your-bot-url/slack/interactivity`
4. Install to workspace
5. Save tokens:
   - `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - `SLACK_SIGNING_SECRET`

### 3. Build and Push Image
```bash
# Build
docker build -t your-registry/slack-k8s-bot:latest .

# Push
docker push your-registry/slack-k8s-bot:latest
```

### 4. Deploy with Helm
```bash
# Add Prometheus repo (for Alertmanager dependency)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Update dependencies
cd helm
helm dependency update

# Install with Anthropic (Claude)
helm install slack-k8s-bot . \
  --create-namespace \
  --namespace monitoring \
  --set image.repository=your-registry/slack-k8s-bot \
  --set image.tag=latest \
  --set slack.botToken="xoxb-your-token" \
  --set slack.signingSecret="your-secret" \
  --set slack.channel="#eks-alerts" \
  --set llm.provider="anthropic" \
  --set llm.anthropicApiKey="sk-ant-your-key" \
  --set alertmanager.enabled=true

# Or with OpenAI (GPT-4)
helm install slack-k8s-bot . \
  --create-namespace \
  --namespace monitoring \
  --set llm.provider="openai" \
  --set llm.openaiApiKey="sk-your-key" \
  # ... other values

# Or with Ollama (self-hosted, free)
helm install slack-k8s-bot . \
  --create-namespace \
  --namespace monitoring \
  --set llm.provider="ollama" \
  --set llm.ollamaUrl="http://ollama.default:11434" \
  # ... other values
```

### 5. Configure Prometheus Rules

If using existing Prometheus, apply alert rules:
```bash
kubectl apply -f examples/prometheus-rules.yaml
```

### 6. Test Alert

Trigger a test alert:
```bash
# Create a crashing pod
kubectl run test-crash --image=busybox --restart=Always -- sh -c "exit 1"

# Watch the bot investigate in Slack
```

## How It Works

### Alert Flow
```
Alert Fires → Alertmanager → Bot → LLM with MCP Tools → Investigation → Slack Report
```

### Example Investigation
```
1. Alert: KubePodCrashLooping
2. LLM: "Let me check the pods"
   → kubectl_get_pods(namespace="prod")
3. LLM: "I see crash loop, let me check logs"
   → kubectl_get_logs(pod="app-123")
4. LLM: "OOMKilled error, let me check resources"
   → kubectl_describe_pod(pod="app-123")
5. LLM: "Memory limit too low"
   → kubectl_get_pod_resources(pod="app-123")
6. LLM: "Root cause found, reporting to Slack"
   → slack_send_alert(...)
```

### MCP Tools Available

**Diagnostic Tools (Read-only):**
- `kubectl_get_pods` - List pods
- `kubectl_describe_pod` - Pod details
- `kubectl_get_logs` - Current logs
- `kubectl_get_previous_logs` - Logs before crash
- `kubectl_get_events` - Recent events
- `kubectl_top_pods` - Resource usage
- `kubectl_top_nodes` - Node usage
- `kubectl_get_nodes` - Node status
- And 12+ more...

**Remediation Tools (Write):**
- `kubectl_restart_pod` - Delete pod to restart
- `kubectl_scale_deployment` - Scale replicas
- `kubectl_cordon_node` - Mark node unschedulable
- `kubectl_uncordon_node` - Mark node schedulable

## Configuration

### Environment Variables

See `.env.example` for all options.

### Helm Values

See `helm/values.yaml` for all configuration options.

### RBAC Permissions

The bot has:
- **Read**: All resources cluster-wide
- **Write**: Pod deletion, deployment scaling, node cordon/uncordon

To restrict permissions, edit `helm/templates/rbac.yaml`.

## Examples

### Alert Examples

See `examples/prometheus-rules.yaml` for 49 pre-configured alerts.

### LLM Provider Switching
```bash
# Switch to OpenAI
helm upgrade slack-k8s-bot . \
  --set llm.provider="openai" \
  --set llm.openaiApiKey="sk-new-key"

# Switch to Ollama (free, self-hosted)
helm upgrade slack-k8s-bot . \
  --set llm.provider="ollama"
```

## Architecture

### Components

- **Express Server**: Receives Alertmanager webhooks and Slack interactions
- **MCP Server**: Provides kubectl and Slack tools to LLM
- **LLM Agent**: Investigates alerts autonomously using MCP tools
- **Kubernetes Service**: Executes kubectl commands via K8s API
- **Slack Service**: Sends rich messages with action buttons

### Why MCP?

Traditional approach: Fixed 3-command limit → Limited investigation

MCP approach: LLM calls tools iteratively → Thorough investigation

## Troubleshooting

### Bot Not Receiving Alerts
```bash
# Check Alertmanager config
kubectl get secret -n monitoring alertmanager-kube-prometheus-stack-alertmanager -o yaml

# Check bot logs
kubectl logs -n monitoring -l app=slack-k8s-bot -f
```

### LLM Not Calling Tools

- Check API key is valid
- Check MCP server logs
- Ensure LLM provider supports function calling

### RBAC Permission Denied
```bash
# Check ServiceAccount permissions
kubectl auth can-i --list --as=system:serviceaccount:monitoring:slack-k8s-bot
```

## License

MIT

## Contributing

Pull requests welcome!
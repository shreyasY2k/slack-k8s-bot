# Troubleshooting Guide

## Bot Not Receiving Alerts

### Check Alertmanager Configuration
```bash
kubectl get secret -n monitoring alertmanager-kube-prometheus-stack-alertmanager -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d
```

Verify webhook URL points to bot service.

### Check Bot Logs
```bash
kubectl logs -n monitoring -l app=slack-k8s-bot -f
```

Look for: `[ALERT] Processing: <alert-name>`

### Test Webhook Manually
```bash
./scripts/test-alert.sh
```

## LLM Not Working

### Check API Key
```bash
kubectl get secret -n monitoring slack-k8s-bot -o jsonpath='{.data.anthropic-api-key}' | base64 -d
```

### Check LLM Provider Logs
Look for: `[LLM] Iteration X/50`

### Test LLM Connection
```bash
kubectl exec -n monitoring -it <bot-pod> -- node -e "
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'test' }]
}).then(console.log).catch(console.error);
"
```

## Kubectl Commands Failing

### Check RBAC Permissions
```bash
kubectl auth can-i --list --as=system:serviceaccount:monitoring:slack-k8s-bot
```

### Check ServiceAccount
```bash
kubectl get sa -n monitoring slack-k8s-bot -o yaml
```

### Test Command Manually
```bash
kubectl exec -n monitoring -it <bot-pod> -- kubectl get pods -n default
```

## Slack Messages Not Appearing

### Verify Bot Token
```bash
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

### Check Channel Permissions
Ensure bot is invited to channel:
```
/invite @K8s Alert Bot
```

### Check Bot Logs
Look for: `[SLACK] User clicked: <action>`

## High Memory Usage

### Check Pod Resources
```bash
kubectl top pod -n monitoring -l app=slack-k8s-bot
```

### Increase Memory Limit
```bash
helm upgrade slack-k8s-bot ./helm \
  --set resources.limits.memory=2Gi
```

## Alerts Not Firing

### Check Prometheus Rules
```bash
kubectl get prometheusrules -n monitoring
kubectl get prometheusrules -n monitoring kubernetes-alerts-complete -o yaml
```

### Check Prometheus Targets
```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```
Visit: http://localhost:9090/targets

### Manually Trigger Alert
```bash
# Create crashing pod
kubectl run test-crash --image=busybox --restart=Always -- sh -c "exit 1"

# Wait 5 minutes, check Alertmanager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
```
Visit: http://localhost:9093
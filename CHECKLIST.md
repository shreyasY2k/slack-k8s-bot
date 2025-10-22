# Deployment Checklist

## Pre-Deployment

- [ ] Kubernetes cluster accessible
- [ ] kubectl configured
- [ ] Helm 3.x installed
- [ ] Docker registry access
- [ ] Slack app created
- [ ] LLM API key obtained

## Slack Configuration

- [ ] Bot token obtained (xoxb-)
- [ ] Signing secret obtained
- [ ] Bot scopes added: chat:write, commands
- [ ] Bot invited to channel
- [ ] Interactivity URL configured (after deployment)

## Build and Push

- [ ] Update image repository in Makefile/values.yaml
- [ ] Run: `make build`
- [ ] Run: `make push`
- [ ] Verify image in registry

## Kubernetes Deployment

- [ ] Create namespace: `kubectl create ns monitoring`
- [ ] Update helm/values.yaml with your values
- [ ] Run: `helm dependency update` in helm/
- [ ] Run: `make deploy`
- [ ] Verify pods running: `kubectl get pods -n monitoring`
- [ ] Check logs: `kubectl logs -n monitoring -l app=slack-k8s-bot`

## Prometheus Configuration

- [ ] Install Prometheus: `./scripts/install-prometheus.sh`
- [ ] Apply alert rules: `kubectl apply -f examples/prometheus-rules-complete.yaml`
- [ ] Verify rules loaded in Prometheus UI

## Alertmanager Configuration

- [ ] Configure webhook in Alertmanager
- [ ] Restart Alertmanager pods
- [ ] Verify webhook in Alertmanager UI

## Testing

- [ ] Run health check: `curl http://bot-url:8080/health`
- [ ] Send test alert: `./scripts/test-alert.sh`
- [ ] Verify message in Slack
- [ ] Click remediation button
- [ ] Verify command executed

## Monitoring

- [ ] Set up metrics scraping
- [ ] Configure alerts for bot itself
- [ ] Set up log aggregation

## Documentation

- [ ] Update README with your setup
- [ ] Document custom alert rules
- [ ] Share runbooks with team
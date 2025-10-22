#!/bin/bash

set -e

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Run ./scripts/setup-slack.sh first"
    exit 1
fi

source .env

NAMESPACE=${NAMESPACE:-monitoring}
RELEASE_NAME=${RELEASE_NAME:-slack-k8s-bot}

echo "Generating Kubernetes secret for namespace: $NAMESPACE"

kubectl create secret generic $RELEASE_NAME \
    --from-literal=slack-bot-token="$SLACK_BOT_TOKEN" \
    --from-literal=slack-signing-secret="$SLACK_SIGNING_SECRET" \
    --from-literal=anthropic-api-key="${ANTHROPIC_API_KEY:-}" \
    --from-literal=openai-api-key="${OPENAI_API_KEY:-}" \
    --from-literal=gemini-api-key="${GEMINI_API_KEY:-}" \
    --namespace=$NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret created/updated successfully"
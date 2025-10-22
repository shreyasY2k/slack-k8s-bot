#!/bin/bash

set -e

NAMESPACE=${NAMESPACE:-monitoring}

echo "Installing Prometheus Stack..."

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace $NAMESPACE \
    --create-namespace \
    --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
    --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
    --set alertmanager.enabled=true

echo ""
echo "✅ Prometheus Stack installed!"
echo ""
echo "Apply alert rules:"
echo "  kubectl apply -f examples/prometheus-rules-complete.yaml"
echo ""
echo "Configure Alertmanager:"
echo "  kubectl apply -f examples/alertmanager-config.yaml"
echo ""
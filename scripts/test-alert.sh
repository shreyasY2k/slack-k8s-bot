#!/bin/bash

BOT_URL=${BOT_URL:-http://localhost:8080}

echo "Sending test alert to $BOT_URL/alertmanager"

curl -X POST "$BOT_URL/alertmanager" \
  -H "Content-Type: application/json" \
  -d '{
  "receiver": "slack-k8s-bot",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "KubePodCrashLooping",
        "severity": "warning",
        "namespace": "production",
        "pod": "my-app-7d5f6b8c-xkz9m",
        "container": "app"
      },
      "annotations": {
        "summary": "Pod production/my-app-7d5f6b8c-xkz9m is crash looping",
        "description": "Container app has restarted 5 times in the last 10 minutes due to OOMKilled"
      },
      "startsAt": "2024-01-15T10:00:00.000Z",
      "generatorURL": "http://prometheus:9090/graph"
    }
  ],
  "groupLabels": {
    "alertname": "KubePodCrashLooping"
  },
  "commonLabels": {
    "alertname": "KubePodCrashLooping",
    "severity": "warning"
  },
  "commonAnnotations": {},
  "externalURL": "http://alertmanager:9093",
  "version": "4",
  "groupKey": "{}/{alertname=\"KubePodCrashLooping\"}"
}'

echo ""
echo "Test alert sent! Check your Slack channel."
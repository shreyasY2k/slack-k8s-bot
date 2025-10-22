import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const BOT_URL = process.env.BOT_URL || 'http://localhost:8080';

describe('Slack K8s Bot Integration Tests', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${BOT_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });
  });

  describe('Alertmanager Webhook', () => {
    it('should accept valid alert webhook', async () => {
      const alert = {
        receiver: 'slack-k8s-bot',
        status: 'firing',
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'KubePodCrashLooping',
              severity: 'warning',
              namespace: 'default',
              pod: 'test-pod',
            },
            annotations: {
              summary: 'Pod is crash looping',
              description: 'Pod has restarted 5 times',
            },
          },
        ],
        groupLabels: {},
        commonLabels: {},
        commonAnnotations: {},
        externalURL: 'http://alertmanager:9093',
        version: '4',
        groupKey: 'test',
      };

      const response = await axios.post(`${BOT_URL}/alertmanager`, alert);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
    });

    it('should handle invalid alert gracefully', async () => {
      const response = await axios.post(`${BOT_URL}/alertmanager`, {
        invalid: 'data',
      });
      expect(response.status).toBe(200);
    });
  });
});
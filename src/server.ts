import express from 'express';
import { AlertmanagerHandler } from './handlers/alertmanager.handler.js';
import { SlackHandler } from './handlers/slack.handler.js';

// Simple in-memory metrics
const metrics = {
  alerts_received_total: 0,
  alerts_processed_total: 0,
  alerts_failed_total: 0,
  slack_messages_sent_total: 0,
  llm_calls_total: 0,
  kubectl_commands_total: 0,
};

export function incrementMetric(metric: keyof typeof metrics) {
  metrics[metric]++;
}

export function createServer() {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const alertmanagerHandler = new AlertmanagerHandler();
  const slackHandler = new SlackHandler();

  // Routes
  app.post('/alertmanager', (req, res) => {
    incrementMetric('alerts_received_total');
    alertmanagerHandler.handleWebhook(req, res);
  });
  
  app.post('/slack/interactivity', (req, res) => slackHandler.handleInteractivity(req, res));
  
  app.get('/health', (req, res) => res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }));

  // Prometheus metrics endpoint
  app.get('/metrics', (req, res) => {
    const prometheusMetrics = Object.entries(metrics)
      .map(([key, value]) => `${key} ${value}`)
      .join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics + '\n');
  });

  return app;
}
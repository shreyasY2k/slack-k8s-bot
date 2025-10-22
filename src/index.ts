import { createServer } from './server';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;

const app = createServer();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Slack K8s Bot with MCP                                      ║
║                                                               ║
║   Server running on port ${PORT}                              ║
║   LLM Provider: ${process.env.LLM_PROVIDER || 'anthropic'}    ║
║   Slack Channel: ${process.env.SLACK_CHANNEL || '#eks-alerts'}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

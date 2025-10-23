import { MCPKubernetesServer } from './mcp/mcp-server.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting MCP Kubernetes Server in standalone mode...');
  
  const server = new MCPKubernetesServer();
  
  // Start stdio transport
  await server.start();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down MCP server...');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
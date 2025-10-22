#!/bin/bash

set -e

echo "==================================="
echo "Slack K8s Bot - Slack Setup Helper"
echo "==================================="
echo ""

echo "This script will help you configure your Slack app."
echo ""
echo "Prerequisites:"
echo "1. Go to https://api.slack.com/apps"
echo "2. Create a new app (from scratch)"
echo "3. Name it 'K8s Alert Bot'"
echo ""

read -p "Press Enter to continue..."

echo ""
echo "Step 1: Configure OAuth & Permissions"
echo "----------------------------------------"
echo "Go to: OAuth & Permissions → Scopes → Bot Token Scopes"
echo "Add these scopes:"
echo "  - chat:write"
echo "  - chat:write.public"
echo "  - commands"
echo ""

read -p "Press Enter when done..."

echo ""
echo "Step 2: Install App to Workspace"
echo "-----------------------------------"
echo "Go to: OAuth & Permissions → Install to Workspace"
echo "Click 'Install to Workspace' and authorize"
echo ""

read -p "Press Enter when done..."

echo ""
echo "Step 3: Get Bot Token"
echo "----------------------"
read -p "Enter your Bot User OAuth Token (starts with xoxb-): " SLACK_BOT_TOKEN

echo ""
echo "Step 4: Get Signing Secret"
echo "---------------------------"
echo "Go to: Basic Information → App Credentials"
read -p "Enter your Signing Secret: " SLACK_SIGNING_SECRET

echo ""
echo "Step 5: Select Channel"
echo "-----------------------"
read -p "Enter the Slack channel for alerts (e.g., #eks-alerts): " SLACK_CHANNEL

echo ""
echo "Creating .env file..."

cat > .env << EOF
# Slack Configuration
SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET
SLACK_CHANNEL=$SLACK_CHANNEL

# LLM Provider
LLM_PROVIDER=anthropic

# Add your LLM API keys below
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
EOF

echo ""
echo "✅ .env file created!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your LLM API key"
echo "2. Run: npm install"
echo "3. Run: npm run dev"
echo ""
echo "To configure interactivity:"
echo "1. Run the bot (npm run dev)"
echo "2. Expose port 8080 (use ngrok: 'ngrok http 8080')"
echo "3. Go to: Interactivity & Shortcuts → Enable Interactivity"
echo "4. Set Request URL to: https://your-url/slack/interactivity"
echo ""
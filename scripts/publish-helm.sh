#!/bin/bash

set -e

# Get the script's directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📦 Packaging Helm Chart for GitHub Pages..."
echo "Repository root: $REPO_ROOT"
echo ""

# Change to repo root
cd "$REPO_ROOT"

# Check if helm directory exists
if [ ! -d "helm" ]; then
    echo "❌ Error: helm/ directory not found in $REPO_ROOT"
    exit 1
fi

# Update Helm dependencies first
echo "Updating Helm dependencies..."
cd helm
helm dependency update
cd ..

# Create/clear the chart-releases directory
mkdir -p chart-releases
cd chart-releases

# Package the chart
echo "Building chart package..."
helm package ../helm

# Generate/update index
echo "Generating Helm repository index..."
helm repo index . --url https://shreyasy2k.github.io/slack-k8s-bot

echo ""
echo "✅ Chart packaged successfully!"
echo ""
echo "Files created in: $REPO_ROOT/chart-releases/"
ls -lh
echo ""
echo "Next steps:"
echo "1. Replace YOUR_GITHUB_USERNAME in index.yaml with your actual GitHub username"
echo "   sed -i 's/YOUR_GITHUB_USERNAME/your_username/g' index.yaml"
echo ""
echo "2. Commit to gh-pages branch:"
echo "   git checkout gh-pages"
echo "   mv chart-releases/* ."
echo "   rm -rf chart-releases/"
echo "   git add index.yaml *.tgz"
echo "   git commit -m 'Publish Helm chart'"
echo "   git push origin gh-pages"
echo ""
echo "3. Enable GitHub Pages:"
echo "   Go to: Settings → Pages → Source: gh-pages branch → / (root)"
echo ""
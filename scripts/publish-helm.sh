# From main branch
cd ~/workdir/gitclones/slack-k8s-bot
git checkout main

# Create a worktree for gh-pages in a separate directory
git worktree add /tmp/gh-pages gh-pages

# Package chart from main
helm package helm/ -d /tmp/gh-pages/

# Generate index in gh-pages directory
helm repo index /tmp/gh-pages/ --url https://shreyasy2k.github.io/slack-k8s-bot

# Go to gh-pages worktree and commit
cd /tmp/gh-pages
git add index.yaml slack-k8s-bot-*.tgz
git commit -m "Publish Helm chart v1.0.0"
git push origin gh-pages

# Go back to main
cd ~/workdir/gitclones/slack-k8s-bot

# Cleanup worktree
git worktree remove /tmp/gh-pages
.PHONY: help build push deploy test clean

# Variables
REGISTRY ?= your-registry
IMAGE_NAME ?= slack-k8s-bot
IMAGE_TAG ?= latest
NAMESPACE ?= monitoring
RELEASE_NAME ?= slack-k8s-bot

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build Docker image
	docker build -t $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) .

push: build ## Push Docker image to registry
	docker push $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)

deps: ## Update Helm dependencies
	cd helm && helm dependency update

deploy: deps ## Deploy to Kubernetes
	helm upgrade --install $(RELEASE_NAME) ./helm \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--values values.yaml

deploy-dev: ## Deploy with development values
	helm upgrade --install $(RELEASE_NAME) ./helm \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(IMAGE_TAG) \
		--values values-dev.yaml

uninstall: ## Uninstall from Kubernetes
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE)

logs: ## Tail logs from bot
	kubectl logs -n $(NAMESPACE) -l app=$(IMAGE_NAME) -f

test: ## Run tests locally
	npm test

test-integration: ## Run integration tests
	npm run test:integration

clean: ## Clean build artifacts
	rm -rf dist/ node_modules/ helm/charts/ helm/Chart.lock

apply-rules: ## Apply Prometheus rules
	kubectl apply -f examples/prometheus-rules-complete.yaml

port-forward: ## Port forward to bot
	kubectl port-forward -n $(NAMESPACE) svc/$(RELEASE_NAME) 8080:8080

dev: ## Run bot locally
	npm run dev

mcp-dev: ## Run MCP server in standalone mode
	npm run mcp:dev
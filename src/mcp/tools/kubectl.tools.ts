import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function getKubectlTools(): Tool[] {
  return [
    {
      name: 'kubectl_get_pods',
      description: 'List pods in a namespace with their status, restart count, and age. Use this as a first step to see the overall state of pods.',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace (e.g., "default", "production", "monitoring")',
          },
          labelSelector: {
            type: 'string',
            description: 'Optional label selector to filter pods (e.g., "app=nginx,tier=frontend")',
          },
        },
        required: ['namespace'],
      },
    },
    {
      name: 'kubectl_describe_pod',
      description: 'Get comprehensive details about a specific pod including: state, conditions, events, resource limits/requests, volumes, and container statuses. Use this when you need detailed information about a specific pod.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Exact pod name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_logs',
      description: 'Retrieve current application logs from a pod container. This shows what the application is currently logging. Use this to see recent application output, errors, or stack traces.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Pod name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
          container: {
            type: 'string',
            description: 'Container name (optional, required only for multi-container pods)',
          },
          tail: {
            type: 'number',
            description: 'Number of lines to retrieve from the end of logs (default: 100, max: 1000)',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_previous_logs',
      description: 'Get logs from the PREVIOUS instance of a container (before the last restart/crash). Critical for debugging crash loops - shows what happened right before the crash.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Pod name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
          container: {
            type: 'string',
            description: 'Container name (optional)',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_events',
      description: 'List recent Kubernetes events in a namespace. Events include: pod scheduling, image pulls, failures, warnings, volume mounts, resource issues. Use this to see what Kubernetes has been doing and any problems it encountered.',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
          fieldSelector: {
            type: 'string',
            description: 'Optional field selector (e.g., "involvedObject.name=my-pod")',
          },
        },
        required: ['namespace'],
      },
    },
    {
      name: 'kubectl_top_pods',
      description: 'Show current CPU and memory usage for all pods in a namespace. Requires metrics-server. Use this to identify resource-hungry pods or to verify resource usage patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['namespace'],
      },
    },
    {
      name: 'kubectl_top_nodes',
      description: 'Show current CPU and memory usage for all cluster nodes. Use this to check node capacity and identify overloaded nodes.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'kubectl_get_nodes',
      description: 'List all nodes in the cluster with their status (Ready/NotReady), roles, age, and version. Use this to check overall cluster health.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'kubectl_describe_node',
      description: 'Get detailed information about a node: capacity, allocatable resources, conditions (disk pressure, memory pressure, PID pressure), running pods, and allocated resources.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Node name (exact name from kubectl_get_nodes)',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'kubectl_get_deployment',
      description: 'Get deployment status including desired vs available replicas, update strategy, and conditions.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Deployment name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_statefulset',
      description: 'Get statefulset status including desired vs ready replicas and update status.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'StatefulSet name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_hpa',
      description: 'Get Horizontal Pod Autoscaler status: current/desired replicas, current metrics (CPU/memory), and scaling conditions.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'HPA name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_list_hpa',
      description: 'List all HPAs in a namespace with their current scaling status.',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['namespace'],
      },
    },
    {
      name: 'kubectl_get_pvc',
      description: 'Get PersistentVolumeClaim details: status (Bound/Pending), capacity, storage class, and access modes.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'PVC name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_list_pvc',
      description: 'List all PVCs in a namespace with their status and capacity.',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['namespace'],
      },
    },
    {
      name: 'kubectl_get_service',
      description: 'Get service details: type (ClusterIP/NodePort/LoadBalancer), endpoints, ports, and selectors.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Service name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_configmap',
      description: 'Get ConfigMap data keys (not full content for security). Use to verify config exists.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'ConfigMap name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_get_pod_resources',
      description: 'Get resource requests and limits for all containers in a pod. Use this to check if limits are appropriate for the workload.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Pod name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    // Remediation tools
    {
      name: 'kubectl_restart_pod',
      description: 'Delete a pod to force Kubernetes to restart it. The ReplicaSet/Deployment will automatically create a new pod. Use this for stuck pods, config reloads, or temporary issues. WARNING: This will cause brief downtime for this pod.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Pod name to restart',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
        },
        required: ['name', 'namespace'],
      },
    },
    {
      name: 'kubectl_scale_deployment',
      description: 'Change the number of replicas for a deployment. Use to scale up (more capacity), scale down (reduce costs), or scale to 0 (stop application). WARNING: This changes production capacity.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Deployment name',
          },
          namespace: {
            type: 'string',
            description: 'Kubernetes namespace',
          },
          replicas: {
            type: 'number',
            description: 'Desired number of replicas (0 to stop, >0 to run)',
          },
        },
        required: ['name', 'namespace', 'replicas'],
      },
    },
    {
      name: 'kubectl_cordon_node',
      description: 'Mark a node as unschedulable - no NEW pods will be placed on it, but existing pods remain. Use before maintenance or when a node is problematic. Does NOT evict existing pods.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Node name to cordon',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'kubectl_uncordon_node',
      description: 'Mark a node as schedulable again after cordoning or maintenance. Allows new pods to be scheduled on the node.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Node name to uncordon',
          },
        },
        required: ['name'],
      },
    },
  ];
}
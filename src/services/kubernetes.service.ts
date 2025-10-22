import * as k8s from '@kubernetes/client-node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class KubernetesService {
  private kc: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private autoscalingApi: k8s.AutoscalingV2Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.autoscalingApi = this.kc.makeApiClient(k8s.AutoscalingV2Api);
  }

  async executeCommand(commandType: string, params: Record<string, any>): Promise<string> {
    try {
      const namespace = params.namespace || 'default';

      switch (commandType) {
        // Read operations
        case 'get_pods':
          return await this.getPods(namespace, params.labelSelector);
        case 'describe_pod':
          return await this.describePod(params.name, namespace);
        case 'get_logs':
          return await this.getLogs(params.name, namespace, params.container, params.tail);
        case 'get_previous_logs':
          return await this.getPreviousLogs(params.name, namespace, params.container);
        case 'get_events':
          return await this.getEvents(namespace, params.fieldSelector);
        case 'top_pods':
          return await this.topPods(namespace);
        case 'top_nodes':
          return await this.topNodes();
        case 'get_nodes':
          return await this.getNodes();
        case 'describe_node':
          return await this.describeNode(params.name);
        case 'get_deployment':
          return await this.getDeployment(params.name, namespace);
        case 'get_statefulset':
          return await this.getStatefulSet(params.name, namespace);
        case 'get_hpa':
          return await this.getHPA(params.name, namespace);
        case 'list_hpa':
          return await this.listHPA(namespace);
        case 'get_pvc':
          return await this.getPVC(params.name, namespace);
        case 'list_pvc':
          return await this.listPVC(namespace);
        case 'get_service':
          return await this.getService(params.name, namespace);
        case 'get_configmap':
          return await this.getConfigMap(params.name, namespace);
        case 'get_pod_resources':
          return await this.getPodResources(params.name, namespace);

        // Write operations
        case 'restart_pod':
          return await this.restartPod(params.name, namespace);
        case 'scale_deployment':
          return await this.scaleDeployment(params.name, namespace, params.replicas);
        case 'cordon_node':
          return await this.cordonNode(params.name);
        case 'uncordon_node':
          return await this.uncordonNode(params.name);

        default:
          return `Unknown command type: ${commandType}`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[K8S] Command ${commandType} failed:`, message);
      return `Error executing ${commandType}: ${message}`;
    }
  }

  private async getPods(namespace: string, labelSelector?: string): Promise<string> {
    const res = await this.coreApi.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    if (res.body.items.length === 0) {
      return `No pods found in namespace ${namespace}${labelSelector ? ` with selector ${labelSelector}` : ''}`;
    }

    return res.body.items
      .slice(0, 20)
      .map((pod) => {
        const containers = pod.status?.containerStatuses || [];
        const restarts = containers.reduce((sum, c) => sum + c.restartCount, 0);
        const ready = containers.filter((c) => c.ready).length;
        const total = containers.length;

        return `${pod.metadata?.name}: ${pod.status?.phase} | Ready: ${ready}/${total} | Restarts: ${restarts} | Age: ${this.getAge(pod.metadata?.creationTimestamp)}`;
      })
      .join('\n');
  }

  private async describePod(name: string, namespace: string): Promise<string> {
    const res = await this.coreApi.readNamespacedPod(name, namespace);
    const pod = res.body;

    const containers =
      pod.status?.containerStatuses
        ?.map((c) => {
          let state = 'Unknown';
          if (c.state?.running) state = 'Running';
          else if (c.state?.waiting) state = `Waiting: ${c.state.waiting.reason}`;
          else if (c.state?.terminated)
            state = `Terminated: ${c.state.terminated.reason} (exit ${c.state.terminated.exitCode})`;

          return `  ${c.name}:
    Image: ${c.image}
    State: ${state}
    Ready: ${c.ready}
    Restarts: ${c.restartCount}
    ${c.lastState?.terminated ? `Last Termination: ${c.lastState.terminated.reason} (exit ${c.lastState.terminated.exitCode})` : ''}`;
        })
        .join('\n') || 'No containers';

    const conditions =
      pod.status?.conditions
        ?.map((c) => `  ${c.type}: ${c.status} ${c.reason ? `(${c.reason})` : ''}`)
        .join('\n') || 'No conditions';

    const events = await this.getRecentPodEvents(name, namespace);

    return `Pod: ${pod.metadata?.name}
Namespace: ${namespace}
Status: ${pod.status?.phase}
Node: ${pod.spec?.nodeName || 'Not assigned'}
IP: ${pod.status?.podIP || 'None'}
Started: ${pod.status?.startTime || 'Unknown'}

Containers:
${containers}

Conditions:
${conditions}

Recent Events:
${events}`;
  }

  private async getRecentPodEvents(podName: string, namespace: string): Promise<string> {
    try {
      const res = await this.coreApi.listNamespacedEvent(
        namespace,
        undefined,
        undefined,
        undefined,
        `involvedObject.name=${podName}`
      );

      if (res.body.items.length === 0) {
        return '  No recent events';
      }

      return res.body.items
        .sort((a, b) => {
          const timeA = new Date(a.lastTimestamp || a.eventTime || 0).getTime();
          const timeB = new Date(b.lastTimestamp || b.eventTime || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 5)
        .map((e) => `  [${e.type}] ${e.reason}: ${e.message}`)
        .join('\n');
    } catch {
      return '  Unable to fetch events';
    }
  }

  private async getLogs(
    name: string,
    namespace: string,
    container?: string,
    tail?: number
  ): Promise<string> {
    try {
      const res = await this.coreApi.readNamespacedPodLog(
        name,
        namespace,
        container,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        tail || 100
      );

      if (!res.body || res.body.trim().length === 0) {
        return 'No logs available';
      }

      return res.body;
    } catch (error) {
      return `Unable to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getPreviousLogs(
    name: string,
    namespace: string,
    container?: string
  ): Promise<string> {
    try {
      const res = await this.coreApi.readNamespacedPodLog(
        name,
        namespace,
        container,
        false, // follow
        false, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        "false", // pretty
        true, // previous
        undefined, // sinceSeconds
        100 // tailLines
      );

      if (!res.body || res.body.trim().length === 0) {
        return 'No previous logs available (pod may not have restarted)';
      }

      return res.body;
    } catch (error) {
      return `Unable to fetch previous logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getEvents(namespace: string, fieldSelector?: string): Promise<string> {
    const res = await this.coreApi.listNamespacedEvent(
      namespace,
      undefined,
      undefined,
      undefined,
      fieldSelector
    );

    if (res.body.items.length === 0) {
      return `No events found in namespace ${namespace}`;
    }

    return res.body.items
      .sort((a, b) => {
        const timeA = new Date(a.lastTimestamp || a.eventTime || 0).getTime();
        const timeB = new Date(b.lastTimestamp || b.eventTime || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 20)
      .map((event) => {
        const time = event.lastTimestamp || event.eventTime || 'Unknown time';
        return `[${event.type}] ${time} - ${event.reason}: ${event.message}`;
      })
      .join('\n');
  }

  private async topPods(namespace: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`kubectl top pods -n ${namespace} --no-headers 2>&1`);

      if (stdout.includes('Metrics API not available') || stdout.includes('error')) {
        return 'Metrics server not available. Cannot fetch resource usage.';
      }

      if (!stdout.trim()) {
        return `No pods found in namespace ${namespace}`;
      }

      return stdout.trim();
    } catch (error) {
      return 'Metrics server not available or not responding';
    }
  }

  private async topNodes(): Promise<string> {
    try {
      const { stdout } = await execAsync('kubectl top nodes --no-headers 2>&1');

      if (stdout.includes('Metrics API not available') || stdout.includes('error')) {
        return 'Metrics server not available. Cannot fetch node resource usage.';
      }

      return stdout.trim();
    } catch (error) {
      return 'Metrics server not available or not responding';
    }
  }

  private async getNodes(): Promise<string> {
    const res = await this.coreApi.listNode();

    return res.body.items
      .map((node) => {
        const condition = node.status?.conditions?.find((c) => c.type === 'Ready');
        const status = condition?.status === 'True' ? 'Ready' : 'NotReady';
        const cpu = node.status?.capacity?.cpu || 'N/A';
        const memory = node.status?.capacity?.memory || 'N/A';
        const age = this.getAge(node.metadata?.creationTimestamp);

        return `${node.metadata?.name}: ${status} | CPU: ${cpu}, Memory: ${memory} | Age: ${age}`;
      })
      .join('\n');
  }

  private async describeNode(name: string): Promise<string> {
    const res = await this.coreApi.readNode(name);
    const node = res.body;

    const conditions =
      node.status?.conditions
        ?.map((c) => `  ${c.type}: ${c.status} ${c.reason ? `(${c.reason})` : ''}`)
        .join('\n') || 'No conditions';

    const capacity = node.status?.capacity;
    const allocatable = node.status?.allocatable;

    return `Node: ${node.metadata?.name}
Status: ${node.status?.conditions?.find((c) => c.type === 'Ready')?.status}
Roles: ${this.getNodeRoles(node)}

Capacity:
  CPU: ${capacity?.cpu}
  Memory: ${capacity?.memory}
  Pods: ${capacity?.pods}

Allocatable:
  CPU: ${allocatable?.cpu}
  Memory: ${allocatable?.memory}
  Pods: ${allocatable?.pods}

Conditions:
${conditions}

System Info:
  OS: ${node.status?.nodeInfo?.osImage}
  Kernel: ${node.status?.nodeInfo?.kernelVersion}
  Container Runtime: ${node.status?.nodeInfo?.containerRuntimeVersion}
  Kubelet: ${node.status?.nodeInfo?.kubeletVersion}`;
  }

  private async getDeployment(name: string, namespace: string): Promise<string> {
    const res = await this.appsApi.readNamespacedDeployment(name, namespace);
    const d = res.body;

    return `Deployment: ${d.metadata?.name}
Namespace: ${namespace}
Desired Replicas: ${d.spec?.replicas}
Current Replicas: ${d.status?.replicas || 0}
Ready Replicas: ${d.status?.readyReplicas || 0}
Available Replicas: ${d.status?.availableReplicas || 0}
Unavailable Replicas: ${d.status?.unavailableReplicas || 0}
Updated Replicas: ${d.status?.updatedReplicas || 0}
Strategy: ${d.spec?.strategy?.type}`;
  }

  private async getStatefulSet(name: string, namespace: string): Promise<string> {
    const res = await this.appsApi.readNamespacedStatefulSet(name, namespace);
    const ss = res.body;

    return `StatefulSet: ${ss.metadata?.name}
Namespace: ${namespace}
Desired Replicas: ${ss.spec?.replicas}
Current Replicas: ${ss.status?.replicas || 0}
Ready Replicas: ${ss.status?.readyReplicas || 0}
Updated Replicas: ${ss.status?.updatedReplicas || 0}`;
  }

  private async getHPA(name: string, namespace: string): Promise<string> {
    const res = await this.autoscalingApi.readNamespacedHorizontalPodAutoscaler(name, namespace);
    const hpa = res.body;

    const metrics =
      hpa.status?.currentMetrics
        ?.map((m) => {
          if (m.type === 'Resource') {
            return `  ${m.resource?.name}: ${m.resource?.current?.averageUtilization}%`;
          }
          return `  ${m.type}: (details not shown)`;
        })
        .join('\n') || '  No metrics';

    return `HPA: ${hpa.metadata?.name}
Target: ${hpa.spec?.scaleTargetRef?.kind}/${hpa.spec?.scaleTargetRef?.name}
Min Replicas: ${hpa.spec?.minReplicas}
Max Replicas: ${hpa.spec?.maxReplicas}
Current Replicas: ${hpa.status?.currentReplicas}
Desired Replicas: ${hpa.status?.desiredReplicas}

Current Metrics:
${metrics}`;
  }

  private async listHPA(namespace: string): Promise<string> {
    const res = await this.autoscalingApi.listNamespacedHorizontalPodAutoscaler(namespace);

    if (res.body.items.length === 0) {
      return `No HPAs found in namespace ${namespace}`;
    }

    return res.body.items
      .map(
        (hpa) =>
          `${hpa.metadata?.name}: ${hpa.status?.currentReplicas}/${hpa.spec?.maxReplicas} replicas (target: ${hpa.spec?.scaleTargetRef?.name})`
      )
      .join('\n');
  }

  private async getPVC(name: string, namespace: string): Promise<string> {
    const res = await this.coreApi.readNamespacedPersistentVolumeClaim(name, namespace);
    const pvc = res.body;

    return `PVC: ${pvc.metadata?.name}
Namespace: ${namespace}
Status: ${pvc.status?.phase}
Capacity: ${JSON.stringify(pvc.status?.capacity)}
Storage Class: ${pvc.spec?.storageClassName || 'Default'}
Access Modes: ${pvc.spec?.accessModes?.join(', ')}
Volume Name: ${pvc.spec?.volumeName || 'Not bound'}`;
  }

  private async listPVC(namespace: string): Promise<string> {
    const res = await this.coreApi.listNamespacedPersistentVolumeClaim(namespace);

    if (res.body.items.length === 0) {
      return `No PVCs found in namespace ${namespace}`;
    }

    return res.body.items
      .map((pvc) => {
        const capacity = pvc.status?.capacity?.storage || 'N/A';
        return `${pvc.metadata?.name}: ${pvc.status?.phase} | Capacity: ${capacity} | StorageClass: ${pvc.spec?.storageClassName || 'Default'}`;
      })
      .join('\n');
  }

  private async getService(name: string, namespace: string): Promise<string> {
    const res = await this.coreApi.readNamespacedService(name, namespace);
    const svc = res.body;

    const ports =
      svc.spec?.ports?.map((p) => `${p.port}:${p.targetPort}/${p.protocol}`).join(', ') || 'None';

    return `Service: ${svc.metadata?.name}
Namespace: ${namespace}
Type: ${svc.spec?.type}
ClusterIP: ${svc.spec?.clusterIP}
Ports: ${ports}
Selector: ${JSON.stringify(svc.spec?.selector)}`;
  }

  private async getConfigMap(name: string, namespace: string): Promise<string> {
    const res = await this.coreApi.readNamespacedConfigMap(name, namespace);
    const cm = res.body;

    const keys = Object.keys(cm.data || {});

    return `ConfigMap: ${cm.metadata?.name}
Namespace: ${namespace}
Keys: ${keys.length > 0 ? keys.join(', ') : 'None'}
(Data content not shown for security)`;
  }

  private async getPodResources(name: string, namespace: string): Promise<string> {
    const res = await this.coreApi.readNamespacedPod(name, namespace);
    const pod = res.body;

    const containers =
      pod.spec?.containers
        ?.map((c) => {
          const requests = c.resources?.requests || {};
          const limits = c.resources?.limits || {};

          return `${c.name}:
  Requests: CPU=${requests.cpu || 'Not set'}, Memory=${requests.memory || 'Not set'}
  Limits: CPU=${limits.cpu || 'Not set'}, Memory=${limits.memory || 'Not set'}`;
        })
        .join('\n\n') || 'No containers';

    return `Pod: ${name}
Namespace: ${namespace}

Container Resources:
${containers}`;
  }

  // Write operations
  private async restartPod(name: string, namespace: string): Promise<string> {
    await this.coreApi.deleteNamespacedPod(name, namespace);
    return `✅ Pod ${name} deleted successfully. Kubernetes will recreate it automatically.`;
  }

  private async scaleDeployment(
    name: string,
    namespace: string,
    replicas: number
  ): Promise<string> {
    const patch = {
      spec: {
        replicas: replicas,
      },
    };

    await this.appsApi.patchNamespacedDeployment(
      name,
      namespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
    );

    return `✅ Deployment ${name} scaled to ${replicas} replicas`;
  }

  private async cordonNode(name: string): Promise<string> {
    const patch = {
      spec: {
        unschedulable: true,
      },
    };

    await this.coreApi.patchNode(
      name,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
    );

    return `✅ Node ${name} cordoned (marked unschedulable). New pods will not be scheduled here.`;
  }

  private async uncordonNode(name: string): Promise<string> {
    const patch = {
      spec: {
        unschedulable: false,
      },
    };

    await this.coreApi.patchNode(
      name,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
    );

    return `✅ Node ${name} uncordoned (marked schedulable). New pods can be scheduled here.`;
  }

  // Helper methods
  private getAge(timestamp?: Date | string): string {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${diffMins}m`;
  }

  private getNodeRoles(node: any): string {
    const labels = node.metadata?.labels || {};
    const roles = Object.keys(labels)
      .filter((k) => k.startsWith('node-role.kubernetes.io/'))
      .map((k) => k.replace('node-role.kubernetes.io/', ''));

    return roles.length > 0 ? roles.join(', ') : 'worker';
  }
}

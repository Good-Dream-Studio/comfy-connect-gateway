import { Cluster } from './cluster'
import { Queue } from './queue'
import { Dispatcher } from './dispatcher'
import { metrics } from './metrics'
import { GatewayScripts, MetricsData } from './gateway'
import { Instance } from './instance'
import { Task } from './task'

export class MetricsUpdater {
  private cluster: Cluster
  private queue: Queue
  private dispatcher: Dispatcher
  private updateInterval: NodeJS.Timeout | null = null
  private intervalMs: number
  private scripts?: GatewayScripts

  constructor(
    cluster: Cluster, 
    queue: Queue, 
    dispatcher: Dispatcher,
    intervalMs: number = 5000, // Update every 5 seconds by default
    scripts?: GatewayScripts
  ) {
    this.cluster = cluster
    this.queue = queue
    this.dispatcher = dispatcher
    this.intervalMs = intervalMs
    this.scripts = scripts
  }

  /**
   * Start periodic updates of Prometheus metrics
   */
  start(): void {
    if (this.updateInterval === null) {
      this.updateInterval = setInterval(() => this.updateMetrics(), this.intervalMs)
      console.log(`Started metrics updates every ${this.intervalMs}ms`)
      
      // Immediately update metrics once upon starting
      this.updateMetrics()
    }
  }

  /**
   * Stop periodic updates of Prometheus metrics
   */
  stop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      console.log('Stopped metrics updates')
    }
  }

  /**
   * Updates Prometheus metrics based on current system state
   */
  async updateMetrics(): Promise<void> {
    const queuedTasks = this.queue.getTasks();
    const instances = this.cluster.getInstances();
    const pendingTasks = this.dispatcher.getPendingTasks();

    // Update Prometheus metrics
    this.updateInstanceMetrics(instances);
    this.updateQueueMetrics(queuedTasks);
    this.updateProcessingMetrics(pendingTasks);

    // Call user script with the metrics data
    if (this.scripts?.onMetricsGathered) {
      await this.executeMetricsGatheredScript(instances, queuedTasks, pendingTasks);
    }
  }

  /**
   * Update Prometheus metrics related to instances
   */
  private updateInstanceMetrics(instances: Instance[]): void {
    // Process instance metrics by workflow
    const workflowInstances = new Map<string, number>();
    
    // Count instances by workflow (using tags as workflow indicators)
    instances.forEach(instance => {
      // If instance has no tags, use "default" as workflow name
      const workflows = instance.tags.length > 0 ? instance.tags : ["default"];
      
      workflows.forEach((workflow: string) => {
        const count = workflowInstances.get(workflow) || 0;
        workflowInstances.set(workflow, count + 1);
      });
    });
    
    // Update connected instances gauge
    workflowInstances.forEach((count: number, workflow: string) => {
      metrics.updateConnectedInstances(workflow, count);
    });
    
    // Process instance performance metrics
    instances.forEach(instance => {
      if (instance.lastDurations.length > 0) {
        const avgDuration = instance.lastDurations.reduce((sum: number, duration: number) => sum + duration, 0) / 
                            instance.lastDurations.length;
        metrics.updateInstancePerformance(instance.id, avgDuration);
      }
    });
  }

  /**
   * Update Prometheus metrics related to the task queue
   */
  private updateQueueMetrics(queuedTasks: Task[]): void {
    // Process task queue metrics by workflow
    const queuedByWorkflow = new Map<string, number>();
    queuedTasks.forEach(task => {
      const count = queuedByWorkflow.get(task.workflowName) || 0;
      queuedByWorkflow.set(task.workflowName, count + 1);
    });
    
    // Update task queue gauge
    queuedByWorkflow.forEach((count: number, workflow: string) => {
      metrics.updateTaskQueueSize(workflow, count);
    });
  }

  /**
   * Update Prometheus metrics related to tasks being processed
   */
  private updateProcessingMetrics(pendingTasks: Task[]): void {
    // Process tasks in processing by workflow
    const processingByWorkflow = new Map<string, number>();
    pendingTasks.forEach(task => {
      const count = processingByWorkflow.get(task.workflowName) || 0;
      processingByWorkflow.set(task.workflowName, count + 1);
    });
    
    // Update processing tasks gauge
    processingByWorkflow.forEach((count: number, workflow: string) => {
      metrics.updateProcessingTasks(workflow, count);
    });
  }

  /**
   * Execute the onMetricsGathered script with current metrics data
   */
  private async executeMetricsGatheredScript(
    instances: Instance[], 
    queuedTasks: Task[], 
    pendingTasks: Task[]
  ): Promise<void> {
    try {
      // Calculate instance performance data
      const instancePerformance = new Map<string, number>();
      instances.forEach(instance => {
        if (instance.lastDurations.length > 0) {
          const avgDuration = instance.lastDurations.reduce((sum: number, duration: number) => sum + duration, 0) / 
                            instance.lastDurations.length;
          instancePerformance.set(instance.id, avgDuration);
        }
      });

      // Prepare the metrics data
      const metricsData: MetricsData = {
        instanceCount: instances.length,
        queueSize: queuedTasks.length,
        processingTasks: pendingTasks.length,
        instancePerformance
      };

      // Execute the user script
      if (this.scripts?.onMetricsGathered) {
        await this.scripts.onMetricsGathered(metricsData);
      }
    } catch (error) {
      console.error('Error executing onMetricsGathered script:', error);
    }
  }
}

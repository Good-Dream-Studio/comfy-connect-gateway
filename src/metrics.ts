import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Metrics class for Prometheus monitoring
 * Tracks task execution metrics for the gateway
 */
export class Metrics {
  private registry: Registry;
  
  // Counters
  private tasksReceivedCounter: Counter;
  private tasksSuccessCounter: Counter;
  private tasksErrorCounter: Counter;
  
  // Histograms
  private queueDurationHistogram: Histogram;
  private processingDurationHistogram: Histogram;
  
  // Gauges for real-time metrics
  private connectedInstancesGauge: Gauge;
  private instancePerformanceGauge: Gauge;
  private taskQueueSizeGauge: Gauge;
  private processingTasksGauge: Gauge;
  
  constructor() {
    // Initialize registry
    this.registry = new Registry();
    
    // Configure metrics collectors
    this.tasksReceivedCounter = new Counter({
      name: 'received_tasks_total',
      help: 'Total number of received tasks',
      labelNames: ['workflow_name'],
      registers: [this.registry]
    });
    
    this.tasksSuccessCounter = new Counter({
      name: 'success_tasks_total',
      help: 'Total number of successfully completed tasks',
      labelNames: ['workflow_name', 'instance_id'],
      registers: [this.registry]
    });
    
    this.tasksErrorCounter = new Counter({
      name: 'error_tasks_total',
      help: 'Total number of failed tasks',
      labelNames: ['workflow_name', 'instance_id'],
      registers: [this.registry]
    });
    
    this.queueDurationHistogram = new Histogram({
      name: 'queue_duration_seconds',
      help: 'Time between queuing and dispatching in seconds',
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600], // From 0.1s to 10min
      registers: [this.registry]
    });
    
    this.processingDurationHistogram = new Histogram({
      name: 'processing_duration_seconds',
      help: 'Time between dispatch and result in seconds',
      labelNames: ['workflow_name', 'instance_id'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600], // From 0.1s to 10min
      registers: [this.registry]
    });
    
    // Real-time metrics as gauges
    this.connectedInstancesGauge = new Gauge({
      name: 'connected_instances',
      help: 'Number of currently connected instances',
      labelNames: ['workflow_name'],
      registers: [this.registry]
    });
    
    this.instancePerformanceGauge = new Gauge({
      name: 'instance_performance_seconds',
      help: 'Average duration of recently completed tasks per instance',
      labelNames: ['instance_id'],
      registers: [this.registry]
    });
    
    this.taskQueueSizeGauge = new Gauge({
      name: 'task_queue_size',
      help: 'Current number of tasks waiting in the queue',
      labelNames: ['workflow_name'],
      registers: [this.registry]
    });
    
    this.processingTasksGauge = new Gauge({
      name: 'tasks_in_process',
      help: 'Current number of tasks being processed',
      labelNames: ['workflow_name'],
      registers: [this.registry]
    });
  }

  /**
   * Increment the received tasks counter
   * @param workflowName The name of the workflow
   */
  incrementTaskReceived(workflowName: string): void {
    this.tasksReceivedCounter.inc({ workflow_name: workflowName });
  }

  /**
   * Increment the successful tasks counter
   * @param workflowName The name of the workflow
   * @param instanceId The ID of the processing instance
   */
  incrementTaskSuccess(workflowName: string, instanceId: string): void {
    this.tasksSuccessCounter.inc({ workflow_name: workflowName, instance_id: instanceId });
  }

  /**
   * Increment the error tasks counter
   * @param workflowName The name of the workflow
   * @param instanceId The ID of the processing instance
   */
  incrementTaskError(workflowName: string, instanceId: string): void {
    this.tasksErrorCounter.inc({ workflow_name: workflowName, instance_id: instanceId });
  }

  /**
   * Observe queue duration
   * @param durationSeconds Time in queue (in seconds)
   */
  observeQueueDuration(durationSeconds: number): void {
    this.queueDurationHistogram.observe(durationSeconds);
  }

  /**
   * Observe processing duration
   * @param workflowName The name of the workflow
   * @param instanceId The ID of the processing instance
   * @param durationSeconds Processing time (in seconds)
   */
  observeProcessingDuration(workflowName: string, instanceId: string, durationSeconds: number): void {
    this.processingDurationHistogram.observe(
      { workflow_name: workflowName, instance_id: instanceId },
      durationSeconds
    );
  }
  
  /**
   * Get the content type for Prometheus metrics
   */
  getMetricsContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Update the connected instances gauge
   * @param workflowName The name of the workflow
   * @param count Number of connected instances for this workflow
   */
  updateConnectedInstances(workflowName: string, count: number): void {
    this.connectedInstancesGauge.set({ workflow_name: workflowName }, count);
  }

  /**
   * Update the instance performance gauge
   * @param instanceId The ID of the instance
   * @param avgDurationSeconds Average duration in seconds of recent tasks
   */
  updateInstancePerformance(instanceId: string, avgDurationSeconds: number): void {
    this.instancePerformanceGauge.set({ instance_id: instanceId }, avgDurationSeconds);
  }

  /**
   * Update the task queue size gauge
   * @param workflowName The name of the workflow
   * @param size Current size of the queue for this workflow
   */
  updateTaskQueueSize(workflowName: string, size: number): void {
    this.taskQueueSizeGauge.set({ workflow_name: workflowName }, size);
  }

  /**
   * Update the processing tasks gauge
   * @param workflowName The name of the workflow
   * @param count Number of tasks currently being processed
   */
  updateProcessingTasks(workflowName: string, count: number): void {
    this.processingTasksGauge.set({ workflow_name: workflowName }, count);
  }

  /**
   * Get the current metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}

// Singleton instance for use throughout the application
export const metrics = new Metrics();

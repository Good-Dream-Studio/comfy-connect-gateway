import { MetricsData } from './gateway';

/**
 * Options for configuring the AutoScaler
 */
export interface AutoScalerOptions {
  /**
   * Target ratio of queue tasks per instance (default: 2)
   */
  targetQueueRatio?: number;
  
  /**
   * Threshold above which to scale up (default: 3)
   */
  scaleUpThreshold?: number;
  
  /**
   * Threshold below which to scale down (default: 0.5)
   */
  scaleDownThreshold?: number;
  
  /**
   * Maximum number of instances to scale to (default: 10)
   */
  maxInstances?: number;
  
  /**
   * Minimum number of instances to maintain (default: 1)
   */
  minInstances?: number;
  
  /**
   * Cooldown period after scaling up, in ms (default: 5 minutes)
   */
  scaleUpCooldownMs?: number;
  
  /**
   * Cooldown period after scaling down, in ms (default: 10 minutes)
   */
  scaleDownCooldownMs?: number;
  
  /**
   * Function to call when scaling up is needed
   */
  scaleUp?: (count: number) => void | Promise<void>;
  
  /**
   * Function to call when scaling down is needed
   */
  scaleDown?: (count: number) => void | Promise<void>;
  
  /**
   * Function to use for logging (default: console.log)
   */
  logFn?: (message: string) => void;
}

/**
 * Auto Scaler class that provides scaling decisions based on metrics
 * Inspired by AWS DynamoDB Auto Scaling, but simplified.
 */
export class AutoScaler {
  private targetQueueRatio: number;
  private scaleUpThreshold: number;
  private scaleDownThreshold: number;
  private maxInstances: number;
  private minInstances: number;
  private scaleUpCooldownMs: number;
  private scaleDownCooldownMs: number;
  private scaleUp: (count: number) => void | Promise<void>;
  private scaleDown: (count: number) => void | Promise<void>;
  private logFn: (message: string) => void;
  private lastScaleUpTime: number;
  private lastScaleDownTime: number;
  private metrics: MetricsData;

  /**
   * Create a new auto scaler instance
   * @param options Configuration options
   */
  constructor(options: AutoScalerOptions = {}) {
    // Target metrics
    this.targetQueueRatio = options.targetQueueRatio || 2; // Ideal queue:instance ratio
    this.scaleUpThreshold = options.scaleUpThreshold || 3; // Scale up when queue:instance ratio exceeds this
    this.scaleDownThreshold = options.scaleDownThreshold || 0.5; // Scale down when queue:instance ratio is below this
    
    // Scaling limits
    this.maxInstances = options.maxInstances || 10;
    this.minInstances = options.minInstances || 1;
    
    // Cooldown periods
    this.scaleUpCooldownMs = options.scaleUpCooldownMs || 5 * 60 * 1000; // 5 minutes
    this.scaleDownCooldownMs = options.scaleDownCooldownMs || 10 * 60 * 1000; // 10 minutes
    
    // Callback functions
    this.scaleUp = options.scaleUp || (() => {
      this.logFn('Scale up function not provided');
    });
    
    this.scaleDown = options.scaleDown || (() => {
      this.logFn('Scale down function not provided');
    });
    
    this.logFn = options.logFn || console.log;
    
    // Internal state tracking
    this.lastScaleUpTime = 0;
    this.lastScaleDownTime = 0;
    this.metrics = {} as MetricsData;
  }
  
  /**
   * Process metrics data and make scaling decisions
   * @param metricsData Current system metrics
   */
  processMetrics(metricsData: MetricsData): void {
    this.metrics = metricsData;
    
    const {instanceCount, queueSize, processingTasks} = metricsData;
    
    // Skip processing if we have no instances yet
    if (instanceCount === 0) {
      if (queueSize > 0) {
        this.logFn('No instances available but tasks in queue. Scaling up.');
        this.executeScaleUp(1);
      }
      return;
    }
    
    // Calculate current ratio of work to instances
    // Include both queued and processing tasks for a complete picture
    const totalWork = queueSize + processingTasks;
    const currentRatio = totalWork / instanceCount;
    
    this.logFn(`Current metrics - Instances: ${instanceCount}, Queue: ${queueSize}, Processing: ${processingTasks}`);
    this.logFn(`Current work ratio: ${currentRatio.toFixed(2)} tasks per instance (target: ${this.targetQueueRatio})`);
    
    // Check if we need to scale up
    if (this.shouldScaleUp(currentRatio, instanceCount)) {
      this.handleScaleUp(currentRatio, instanceCount);
    }
    // Otherwise, check if we need to scale down
    else if (this.shouldScaleDown(currentRatio, instanceCount)) {
      this.handleScaleDown(currentRatio, instanceCount);
    }
    else {
      this.logFn('No scaling action needed at this time');
    }
  }
  
  /**
   * Determine if we should scale up based on current metrics
   * @param currentRatio Current work per instance ratio
   * @param instanceCount Current number of instances
   * @returns True if we should scale up
   */
  private shouldScaleUp(currentRatio: number, instanceCount: number): boolean {
    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastScaleUpTime < this.scaleUpCooldownMs) {
      this.logFn(`Still in scale-up cooldown period (${Math.round((this.scaleUpCooldownMs - (now - this.lastScaleUpTime)) / 1000)}s remaining)`);
      return false;
    }
    
    // Check if we're at max capacity
    if (instanceCount >= this.maxInstances) {
      this.logFn(`Already at maximum instance count (${this.maxInstances})`);
      return false;
    }
    
    // Check if we're above the threshold
    return currentRatio > this.scaleUpThreshold;
  }
  
  /**
   * Handle scaling up based on current metrics
   * @param currentRatio Current work per instance ratio
   * @param instanceCount Current number of instances
   */
  private handleScaleUp(currentRatio: number, instanceCount: number): void {
    // Calculate how many instances to add
    // The further we are above threshold, the more instances we add
    const ratio = currentRatio / this.targetQueueRatio;
    let instancesToAdd = 1; // Default to adding 1 instance
    
    // Step scaling: add more instances if we're significantly over target
    if (ratio > 3) {
      instancesToAdd = 3;
    } else if (ratio > 2) {
      instancesToAdd = 2;
    }
    
    // Make sure we don't exceed max instances
    instancesToAdd = Math.min(instancesToAdd, this.maxInstances - instanceCount);
    
    if (instancesToAdd > 0) {
      this.logFn(`Scaling up by ${instancesToAdd} instance(s) (ratio: ${currentRatio.toFixed(2)} > threshold: ${this.scaleUpThreshold})`);
      this.executeScaleUp(instancesToAdd);
    }
  }
  
  /**
   * Execute the scale up action
   * @param count Number of instances to add
   */
  private executeScaleUp(count: number): void {
    this.lastScaleUpTime = Date.now();
    this.scaleUp(count);
  }
  
  /**
   * Determine if we should scale down based on current metrics
   * @param currentRatio Current work per instance ratio
   * @param instanceCount Current number of instances
   * @returns True if we should scale down
   */
  private shouldScaleDown(currentRatio: number, instanceCount: number): boolean {
    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastScaleDownTime < this.scaleDownCooldownMs) {
      this.logFn(`Still in scale-down cooldown period (${Math.round((this.scaleDownCooldownMs - (now - this.lastScaleDownTime)) / 1000)}s remaining)`);
      return false;
    }
    
    // Check if we're at min capacity
    if (instanceCount <= this.minInstances) {
      this.logFn(`Already at minimum instance count (${this.minInstances})`);
      return false;
    }
    
    // Don't scale down if there are more in-process tasks than instances
    // This helps prevent scaling down when a batch of tasks just completed
    if (this.metrics.processingTasks >= instanceCount) {
      this.logFn(`Not scaling down: ${this.metrics.processingTasks} tasks still processing`);
      return false;
    }
    
    // Check if we're below the threshold
    return currentRatio < this.scaleDownThreshold;
  }
  
  /**
   * Handle scaling down based on current metrics
   * @param currentRatio Current work per instance ratio
   * @param instanceCount Current number of instances
   */
  private handleScaleDown(currentRatio: number, instanceCount: number): void {
    // By default, remove 1 instance when below threshold
    let instancesToRemove = 1;
    
    // If we're significantly under utilized, remove more instances
    if (currentRatio === 0 && instanceCount > this.minInstances + 2) {
      instancesToRemove = 2;
    }
    
    // Make sure we don't go below min instances
    instancesToRemove = Math.min(instancesToRemove, instanceCount - this.minInstances);
    
    if (instancesToRemove > 0) {
      this.logFn(`Scaling down by ${instancesToRemove} instance(s) (ratio: ${currentRatio.toFixed(2)} < threshold: ${this.scaleDownThreshold})`);
      this.executeScaleDown(instancesToRemove);
    }
  }
  
  /**
   * Execute the scale down action
   * @param count Number of instances to remove
   */
  private executeScaleDown(count: number): void {
    this.lastScaleDownTime = Date.now();
    this.scaleDown(count);
  }
  
  /**
   * Find the optimal instances to terminate
   * @param instancePerformance Map of instance IDs to their performance metrics
   * @param count Number of instances to select for termination
   * @returns Array of instance IDs to terminate
   */
  public findInstancesToTerminate(instancePerformance: Map<string, number>, count: number): string[] {
    // Convert to array of [id, performance] entries
    const instances = Array.from(instancePerformance.entries());
    
    // Sort by performance (higher number = slower instance)
    instances.sort((a, b) => b[1] - a[1]);
    
    // Return the IDs of the slowest instances
    return instances.slice(0, count).map(instance => instance[0]);
  }
}

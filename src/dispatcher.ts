import { Instance } from './instance'
import { Task } from './task'
import { Queue } from './queue'
import { Cluster } from './cluster'
import { EventEmitter } from 'events'

export class Dispatcher extends EventEmitter {
  private pendingTasks = new Map<
    string,
    { resolve: (result: any) => void; reject: (error: any) => void; task: Task }
  >()
  private timeoutDuration = 30000 // 30 seconds
  private maxQueueSize = 500 // Maximum number of tasks in queue

  constructor(private cluster: Cluster, private queue: Queue) {
    super()

    // When a new instance becomes available, try to process the queue
    this.cluster.on('instanceAvailable', () => {
      this.processQueue()
    })

    // Handle instance disconnection by re-queuing active tasks
    this.cluster.on('instanceDisconnected', (instanceId: string) => {
      this.handleInstanceDisconnection(instanceId)
    })
  }

  /**
   * Handle instance disconnection by re-queuing tasks
   */
  private handleInstanceDisconnection(instanceId: string): void {
    // Find all tasks assigned to this instance
    for (const [taskId, taskData] of this.pendingTasks.entries()) {
      const task = taskData.task
      if (task.instanceId === instanceId) {
        console.log(`Re-queuing task ${taskId} due to instance ${instanceId} disconnection`)
        // Reset task state
        task.sentAt = null
        task.instanceId = null

        // Remove from pending tasks
        this.pendingTasks.delete(taskId)

        // Re-queue the task
        this.submitTask(task).then(taskData.resolve).catch(taskData.reject)
      }
    }

    // Process the queue in case there are available instances
    this.processQueue()
  }

  /**
   * Dispatch a task to a specific instance
   */
  public dispatchTask(task: Task, instance: Instance): void {
    instance.busy = true
    task.sentAt = new Date()
    task.instanceId = instance.id

    const timeout = setTimeout(() => {
      console.log(`Task ${task.id} timed out`)
      instance.busy = false

      // Ensure we clean up the event listener
      instance.socket.off('return', handler)

      // Mark task as failed
      task.success = false
      task.errorMessage = 'Timeout waiting for response'

      if (this.pendingTasks.has(task.id)) {
        this.pendingTasks.get(task.id)?.reject(new Error('Timeout waiting for response'))
        this.pendingTasks.delete(task.id)
      }

      this.processQueue()
    }, this.timeoutDuration)

    const handler = (data: any) => {
      // Check that this is the response for our specific task
      if (data.taskId === task.id) {
        clearTimeout(timeout)
        instance.socket.off('return', handler)
        task.responseReceivedAt = new Date()
        task.duration = (task.responseReceivedAt.getTime() - (task.sentAt as Date).getTime()) / 1000

        // Handle success or error from ComfyUI
        if (data.error) {
          task.success = false
          task.errorMessage = data.error

          if (this.pendingTasks.has(task.id)) {
            this.pendingTasks.get(task.id)?.reject(new Error(data.error))
            this.pendingTasks.delete(task.id)
          }
        } else {
          task.success = true

          if (this.pendingTasks.has(task.id)) {
            this.pendingTasks.get(task.id)?.resolve(data.result)
            this.pendingTasks.delete(task.id)
          }
        }

        instance.busy = false
        // Record execution time in instance performance
        instance.recordTask(task.duration as number)
        this.processQueue()
      }
    }

    instance.socket.on('return', handler)
    instance.socket.emit('run', {
      taskId: task.id,
      name: task.workflowName,
      params: task.workflowParams
    })
  }

  /**
   * Process the queue and dispatch tasks to available instances
   */
  public processQueue(): void {
    // Critical section - we need to ensure instance availability doesn't change
    // between checking and dispatching
    const availableInstance = this.cluster.getAvailableInstance()
    if (!availableInstance) return

    // Pre-emptively mark the instance as busy to prevent race conditions
    // where multiple processQueue calls could try to use the same instance
    availableInstance.busy = true

    const nextTask = this.queue.dequeue()
    if (!nextTask) {
      // If there's no task to process, reset the busy flag
      availableInstance.busy = false
      return
    }

    // The dispatchTask method will also set busy=true, but we already did it above
    // to prevent the race condition
    this.dispatchTask(nextTask, availableInstance)
  }

  /**
   * Submit a task to be processed
   * Returns a promise that will be resolved when the task completes
   */
  public submitTask(task: Task): Promise<any> {
    // Check if we've reached the maximum queue size
    if (this.queue.size() >= this.maxQueueSize) {
      return Promise.reject(new Error('Queue is full, try again later'))
    }

    const taskPromise = new Promise<any>((resolve, reject) => {
      this.pendingTasks.set(task.id, { resolve, reject, task })
    })

    // If an instance is available, dispatch immediately, otherwise queue
    const availableInstance = this.cluster.getAvailableInstance()
    if (availableInstance) {
      // Pre-emptively mark the instance as busy to prevent race conditions
      availableInstance.busy = true
      this.dispatchTask(task, availableInstance)
    } else {
      this.queue.enqueue(task)
    }

    return taskPromise
  }

  /**
   * Set the timeout duration for tasks (in milliseconds)
   */
  public setTimeout(duration: number): void {
    this.timeoutDuration = duration
  }

  /**
   * Set the maximum queue size
   */
  public setMaxQueueSize(size: number): void {
    this.maxQueueSize = size
  }
  
  /**
   * Get the maximum queue size
   */
  public getMaxQueueSize(): number {
    return this.maxQueueSize
  }
  
  /**
   * Returns information about currently pending tasks
   */
  public getPendingTasks(): Task[] {
    const tasks: Task[] = []
    
    for (const [, taskData] of this.pendingTasks.entries()) {
      tasks.push(taskData.task)
    }
    
    return tasks
  }
}

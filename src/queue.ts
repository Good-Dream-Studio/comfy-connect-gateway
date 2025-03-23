import { Task } from './task'

export class Queue {
  private tasks: Task[]

  constructor() {
    this.tasks = []
  }

  // Adds a new task to the queue (FIFO)
  public enqueue(task: Task): void {
    this.tasks.push(task)
  }

  // Retrieves and removes the next task to be performed
  public dequeue(): Task | undefined {
    return this.tasks.shift()
  }
  
  // Returns the current size of the queue
  public size(): number {
    return this.tasks.length
  }
  
  // Returns a copy of the current tasks in the queue
  public getTasks(): Task[] {
    return [...this.tasks]
  }
}

import { Socket } from 'socket.io'

export class Instance {
  public id: string
  public socket: Socket
  public connectedAt: Date
  public tasksPerformed: number
  public busy: boolean
  public tags: string[]
  public lastDurations: number[]

  constructor(id: string, socket: Socket, tags: string[] = []) {
    this.id = id
    this.socket = socket
    this.connectedAt = new Date()
    this.tasksPerformed = 0
    this.busy = false
    this.tags = tags
    this.lastDurations = []
  }

  public recordTask(duration: number): void {
    this.lastDurations.push(duration)
    if (this.lastDurations.length > 10) {
      this.lastDurations.shift()
    }
    this.tasksPerformed++
  }
}

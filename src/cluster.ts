import { EventEmitter } from 'events'
import { Instance } from './instance'
import { Socket } from 'socket.io'

export class Cluster extends EventEmitter {
  private instances: Instance[]

  constructor() {
    super()
    this.instances = []
  }
  
  // Returns a copy of all instances
  public getInstances(): Instance[] {
    return [...this.instances]
  }

  public createInstance(id: string, socket: Socket, tags: string[] = []): Instance {
    const instance = new Instance(id, socket, tags)
    this.addInstance(instance)
    return instance
  }

  public addInstance(instance: Instance): void {
    this.instances.push(instance)
    if (!instance.busy) {
      this.emit('instanceAvailable', instance)
    }
  }

  public removeInstance(id: string): void {
    const instanceExists = this.instances.some((instance) => instance.id === id)
    this.instances = this.instances.filter((instance) => instance.id !== id)
    
    // Emit an event that an instance has been disconnected so tasks can be re-queued
    if (instanceExists) {
      this.emit('instanceDisconnected', id)
    }
  }

  public getAvailableInstance(): Instance | undefined {
    return this.instances.find((instance) => !instance.busy)
  }
}

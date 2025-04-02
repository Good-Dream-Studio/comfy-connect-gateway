import { Socket } from 'socket.io'

// Interfaces pour les informations GPU
export interface GpuUtilization {
  gpu: number;
}

export interface GpuMemory {
  total: number;
  used: number;
  percent: number;
}

export interface GpuPower {
  usage: number;
  limit: number;
}

export interface GpuClocks {
  graphics_clock: number;
  memory_clock: number;
  sm_clock: number;
}

export interface GpuPcie {
  tx_bytes: number;
  rx_bytes: number;
  generation: number;
  width_max: number;
  width_current: number;
}

export interface GpuEcc {
  enabled: boolean;
  volatile: number;
  aggregate: number;
}

export interface GpuInfo {
  index: number;
  name: string;
  utilization: GpuUtilization;
  memory: GpuMemory;
  temperature: number;
  power: GpuPower;
  fan_speed: number;
  clocks: GpuClocks;
  pcie: GpuPcie;
  ecc: GpuEcc;
}

export interface GpuInfoData {
  gpus: GpuInfo[];
  timestamp: number;
}

export class Instance {
  public id: string
  public socket: Socket
  public connectedAt: Date
  public tasksPerformed: number
  public busy: boolean
  public tags: string[]
  public lastDurations: number[]
  public gpuInfo: GpuInfoData | null

  constructor(id: string, socket: Socket, tags: string[] = []) {
    this.id = id
    this.socket = socket
    this.connectedAt = new Date()
    this.tasksPerformed = 0
    this.busy = false
    this.tags = tags
    this.lastDurations = []
    this.gpuInfo = null
  }

  public recordTask(duration: number): void {
    this.lastDurations.push(duration)
    if (this.lastDurations.length > 10) {
      this.lastDurations.shift()
    }
    this.tasksPerformed++
  }

  public updateGpuInfo(info: GpuInfoData): void {
    this.gpuInfo = info
  }
}

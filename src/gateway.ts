import express, { NextFunction, Request, Response } from 'express'
import http from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { Cluster } from './cluster'
import { Queue } from './queue'
import { Task } from './task'
import { Dispatcher } from './dispatcher'
import { metrics } from './metrics'
import { MetricsUpdater } from './metrics-updater'
import { Instance } from './instance'

export interface MetricsData {
  instanceCount: number
  queueSize: number
  processingTasks: number
  instancePerformance: Map<string, number>
}

export interface GatewayScripts {
  onStarting?: () => void | Promise<void>
  onInstanceConnecting?: (instance: Instance) => void | Promise<void>
  onMetricsGathered?: (metricsData: MetricsData) => void | Promise<void>
}

export interface GatewayOptions {
  port?: number
  scripts?: GatewayScripts
  metricsInterval?: number
}

export class Gateway {
  private app: express.Application
  private server: http.Server
  private io: SocketIOServer
  private cluster: Cluster
  private queue: Queue
  private dispatcher: Dispatcher
  private metricsUpdater: MetricsUpdater
  private port: number
  private scripts: GatewayScripts

  constructor(options: GatewayOptions = {}) {
    this.port = options.port || 8189
    this.scripts = options.scripts || {}

    this.app = express()
    this.server = http.createServer(this.app)
    this.io = new SocketIOServer(this.server)

    this.app.use(express.json({limit: '50mb'}))
    this.app.use(express.static('public')) // Serve static files from 'public' directory

    this.cluster = new Cluster()
    this.queue = new Queue()
    this.dispatcher = new Dispatcher(this.cluster, this.queue)
    this.metricsUpdater = new MetricsUpdater(
      this.cluster,
      this.queue,
      this.dispatcher,
      options.metricsInterval,
      this.scripts
    )

    this.setupRoutes()
    this.setupSocketIO()
    this.setupGracefulShutdown()
  }

  private asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
      fn(req, res, next).catch((error) => {
        console.error(`Error processing request: ${error.message}`, error)
        next(error)
      })
    }
  }

  private setupRoutes() {
    this.app.post(
      '/api/connect/workflows/:name',
      this.asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { name } = req.params
        const params = req.body

        console.log(`⚡ Received task for workflow ${name}`)
        const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const task = new Task(taskId, name, params)

        // Track received task in metrics
        metrics.incrementTaskReceived(name)

        const taskPromise = this.dispatcher.submitTask(task)

        try {
          const result = await taskPromise
          res.json({ status: 'success', workflow: task.workflowName, result })
        } catch (error: any) {
          res.status(500).json({ error: error.message })
        }
      })
    )

    // Consolidated system status API endpoint
    this.app.get('/api/status', (req, res) => {
      // Get queue data
      const queueSize = this.queue.size()
      const queuedTasks = this.queue.getTasks()

      // Get instance data
      const instances = this.cluster.getInstances()

      // Get pending tasks data
      const pendingTasks = this.dispatcher.getPendingTasks()

      // Return consolidated data
      res.json({
        queue: {
          size: queueSize,
          maxSize: this.dispatcher.getMaxQueueSize(),
          tasks: queuedTasks
        },
        instances: {
          count: instances.length,
          instances: instances.map((instance) => ({
            id: instance.id,
            busy: instance.busy,
            connectedAt: instance.connectedAt,
            tasksPerformed: instance.tasksPerformed,
            tags: instance.tags,
            // Calculate average duration of recent tasks
            avgDuration:
              instance.lastDurations.length > 0
                ? instance.lastDurations.reduce(
                    (sum: number, duration: number) => sum + duration,
                    0
                  ) / instance.lastDurations.length
                : null,
            // Inclure les informations GPU si disponibles
            gpuInfo: instance.gpuInfo
          }))
        },
        pending: {
          count: pendingTasks.length,
          tasks: pendingTasks.map((task) => ({
            id: task.id,
            workflowName: task.workflowName,
            instanceId: task.instanceId,
            sentAt: task.sentAt,
            elapsedTime: task.sentAt ? (new Date().getTime() - task.sentAt.getTime()) / 1000 : null
          }))
        }
      })
    })

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', metrics.getMetricsContentType())
      res.end(await metrics.getMetrics())
    })

    this.app.get('/dashboard', (req, res) => {
      res.sendFile('dashboard.html', { root: './public' })
    })
  }

  private setupSocketIO() {
    // Map pour suivre les compteurs d'instances par IP
    const ipCounters = new Map<string, number>();

    this.io.on('connection', async (socket: Socket) => {
      // Obtenir l'adresse IP du client
      let clientIp = socket.handshake.headers['x-forwarded-for'] || 
                     socket.handshake.address || 
                     socket.conn.remoteAddress;
      
      // Nettoyer l'IP (enlever la partie IPv6 si présente, ex: ::ffff:127.0.0.1)
      if (typeof clientIp === 'string') {
        clientIp = clientIp.replace(/^.*:/, '');
      }
      
      // Incrémenter le compteur pour cette IP
      const counter = (ipCounters.get(clientIp as string) || 0) + 1;
      ipCounters.set(clientIp as string, counter);
      
      // Créer l'ID au format IP#numéro
      const instanceId = `${clientIp}#${counter}`;
      
      console.log(`⚡ New instance connected: ${instanceId}`)

      // Create the instance but set it as busy to prevent it from being available immediately
      const instance = this.cluster.createInstance(instanceId, socket, [], true)

      try {
        // Execute onInstanceConnecting script if defined
        if (this.scripts.onInstanceConnecting) {
          await this.scripts.onInstanceConnecting(instance)
        }

        // Now that the script has executed, mark the instance as not busy and notify the cluster
        instance.busy = false
        this.cluster.notifyInstanceAvailable(instance)
      } catch (error) {
        console.error(
          `Error executing onInstanceConnecting script for instance ${instanceId}:`,
          error
        )
        // In case of error, still mark the instance as available
        instance.busy = false
        this.cluster.notifyInstanceAvailable(instance)
      }

      // Listen for GPU information
      socket.on('gpu_info', (info) => {
        try {
          instance.updateGpuInfo(info)
        } catch (error) {
          console.error(`Erreur lors du traitement des informations GPU pour l'instance ${instanceId}:`, error)
        }
      })

      socket.on('disconnect', () => {
        console.log(`⚡ Instance disconnected: ${instanceId}`)
        this.cluster.removeInstance(instanceId)
      })
    })
  }

  private setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      console.log(`⚡ Shutting down gateway gracefully...`)
      this.stop()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log(`⚡ Shutting down gateway gracefully...`)
      this.stop()
      process.exit(0)
    })
  }

  public async start() {
    // Execute onStarting script if defined
    if (this.scripts.onStarting) {
      try {
        await this.scripts.onStarting()
      } catch (error) {
        console.error('Error executing onStarting script:', error)
      }
    }

    // Start metrics updater
    this.metricsUpdater.start()

    // Start server
    this.server.listen(this.port, () => {
      console.log(`
        _____                 __         _    _ _____
       / ____|               / _|       | |  | |_   _|
      | |     ___  _ __ ___ | |_ _   _  | |  | | | |
      | |    / _ \\| '_ \` _ \\|  _| | | | | |  | | | |
      | |___| (_) | | | | | | | | |_| | | |__| |_| |_
       \\_____\\___/|_| |_| |_|_|  \\__, |  \\____/|_____|
                                  __/ |
                                 |___/
                      CONNECT GATEWAY

  ⚡ Gateway started on port ${this.port}
  ⚡ Dashboard: http://localhost:${this.port}/dashboard
  ⚡ Prometeus Metrics: http://localhost:${this.port}/metrics
  ⚡ Ready to connect ComfyUI instances
  
  Press Ctrl+C to stop
      `)
    })

    return this
  }

  public stop() {
    // Stop the metrics updater
    this.metricsUpdater.stop()

    // Close the server
    if (this.server.listening) {
      this.server.close()
    }

    return this
  }

  public getApp() {
    return this.app
  }

  public getServer() {
    return this.server
  }

  public getIO() {
    return this.io
  }

  public getCluster() {
    return this.cluster
  }

  public getQueue() {
    return this.queue
  }

  public getDispatcher() {
    return this.dispatcher
  }
}

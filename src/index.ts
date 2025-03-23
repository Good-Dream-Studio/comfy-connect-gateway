import express, { NextFunction, Request, Response } from 'express'
import http from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import dotenv from 'dotenv'
import { Cluster } from './cluster'
import { Queue } from './queue'
import { Task } from './task'
import { Dispatcher } from './dispatcher'
import { History } from './history'
dotenv.config()

const PORT = process.env.PORT || 8189
const DB_PATH = process.env.DB_PATH || './history.db'

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server)

app.use(express.json())
app.use(express.static('public'))  // Serve static files from 'public' directory

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => {
      console.error(`Error processing request: ${error.message}`, error)
      next(error)
    })
  }
}

const cluster = new Cluster()
const queue = new Queue()
const history = new History()
const dispatcher = new Dispatcher(cluster, queue)

// Initialize the history database
history.init(DB_PATH).catch(error => {
  console.error('Failed to initialize history database:', error)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await history.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await history.close()
  process.exit(0)
})

io.on('connection', (socket: Socket) => {
  console.log(`New SocketIO client connected: ${socket.id}`)
  const instance = cluster.createInstance(socket.id, socket)

  socket.on('disconnect', () => {
    console.log(`SocketIO client disconnected: ${socket.id}`)
    cluster.removeInstance(socket.id)
  })
})

app.post(
  '/api/connect/workflows/:name',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.params
    const params = req.body

    console.log(`Received task for workflow ${name}`)
    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const task = new Task(taskId, name, params)

    // Add the task to history when it's received
    try {
      await history.addTask(task)
    } catch (error) {
      console.error(`Failed to record task in history: ${error}`)
      // Continue processing the task even if recording fails
    }

    const taskPromise = dispatcher.submitTask(task)

    try {
      const result = await taskPromise
      
      // Update the task in history after completion
      try {
        await history.updateTask(task)
      } catch (error) {
        console.error(`Failed to update task in history: ${error}`)
      }
      
      res.json({ status: 'success', workflow: task.workflowName, result })
    } catch (error: any) {
      // Update the task in history after failure
      try {
        await history.updateTask(task)
      } catch (historyError) {
        console.error(`Failed to update failed task in history: ${historyError}`)
      }
      
      res.status(500).json({ error: error.message })
    }
  })
)

// API routes for history stats
app.get('/api/stats/global', asyncHandler(async (req, res) => {
  const metrics = await history.getGlobalMetrics()
  res.json(metrics)
}))

app.get('/api/stats/timeline', asyncHandler(async (req, res) => {
  const groupBy = (req.query.groupBy as 'day' | 'hour' | 'minute') || 'day'
  const data = await history.getTimelineReceived(groupBy)
  res.json(data)
}))

app.get('/api/stats/status', asyncHandler(async (req, res) => {
  const data = await history.getStatusBreakdown()
  res.json(data)
}))

app.get('/api/stats/durations', asyncHandler(async (req, res) => {
  const data = await history.getTaskDurationDistribution()
  res.json(data)
}))

app.get('/api/stats/instances', asyncHandler(async (req, res) => {
  const data = await history.getInstancePerformance()
  res.json(data)
}))

app.get('/api/stats/workflows', asyncHandler(async (req, res) => {
  const data = await history.getWorkflowBreakdown()
  res.json(data)
}))

app.get('/api/stats/latency', asyncHandler(async (req, res) => {
  const data = await history.getLatencyMetrics()
  res.json(data)
}))

// Real-time API endpoints
app.get('/api/realtime/queue', (req, res) => {
  const queueSize = queue.size()
  const queuedTasks = queue.getTasks() // This will require adding a method to Queue class
  
  res.json({
    size: queueSize,
    maxSize: dispatcher.getMaxQueueSize(), // This will require adding a getter to Dispatcher class
    tasks: queuedTasks
  })
})

app.get('/api/realtime/instances', (req, res) => {
  const instances = cluster.getInstances() // This will require adding a method to Cluster class
  
  res.json({
    count: instances.length,
    instances: instances.map(instance => ({
      id: instance.id,
      busy: instance.busy,
      connectedAt: instance.connectedAt,
      tasksPerformed: instance.tasksPerformed,
      tags: instance.tags,
      // Calculate average duration of recent tasks
      avgDuration: instance.lastDurations.length > 0 
        ? instance.lastDurations.reduce((sum: number, duration: number) => sum + duration, 0) / instance.lastDurations.length 
        : null
    }))
  })
})

app.get('/api/realtime/pending', (req, res) => {
  const pendingTasks = dispatcher.getPendingTasks() // This will require adding a method to Dispatcher class
  
  res.json({
    count: pendingTasks.length,
    tasks: pendingTasks.map(task => ({
      id: task.id,
      workflowName: task.workflowName,
      instanceId: task.instanceId,
      sentAt: task.sentAt,
      elapsedTime: task.sentAt ? (new Date().getTime() - task.sentAt.getTime()) / 1000 : null
    }))
  })
})

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile('dashboard.html', { root: './public' })
})

server.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`)
})

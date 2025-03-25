// You would import from the installed package
// const { Gateway } = require('comfyui-connect-gateway')
// But for a local example, we'll import from the relative path
const { Gateway } = require('../dist')

// Configure the gateway with options
const gateway = new Gateway({
  port: 8189,
  scripts: {
    onStarting: async () => {
      console.log('Gateway is starting up...')
      // You could perform startup tasks here, like loading configurations
    },
    onInstanceConnecting: async (instance) => {
      console.log(`Instance ${instance.id} is connecting...`)
      // You could perform instance warmup tasks here, like sending an initial test workflow
      // The instance will not be available for tasks until this script completes
    },
    onMetricsGathered: async ({ instanceCount, queueSize, processingTasks }) => {
      console.log('Metrics updated:')
      console.log(`- Instance count: ${instanceCount}`)
      console.log(`- Queue size: ${queueSize}`)
      console.log(`- Processing tasks: ${processingTasks}`)
    }
  }
})

// Start the gateway
gateway.start()
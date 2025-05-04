// You would import from the installed package
// const { Gateway } = require('comfyui-connect-gateway')
// But for a local example, we'll import from the relative path
const { Gateway } = require('../dist')

// Configure the gateway with options
const gateway = new Gateway({
  port: 8189,
  scripts: {
    onInstanceConnecting: async (instance) => {
      const taskId = `warmup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      console.log(`Warming up instance ${instance.id} (${taskId}) ...`)
      
      // Only resolve when the workflow has completed, it will bring the instance online 
      // when and only when the workflow has completed (it will stay as busy until then)
      return new Promise((resolve, reject) => {
        // Set up a timeout to prevent hanging if no response is received
        const timeout = setTimeout(() => {
          console.error(`Warmup workflow timeout for instance ${instance.id}`)
          instance.socket.off('return', handleReturn)
          reject(new Error('Warmup workflow timeout'))
        }, 30000) // 30 seconds timeout
        
        // Handle the return event
        const handleReturn = (data) => {
          // Check that this is the response for our specific task
          if (data.taskId === taskId) {
            clearTimeout(timeout)
            instance.socket.off('return', handleReturn)
            
            if (data.error) {
              console.error(`Warmup workflow error for instance ${instance.id}: ${data.error}`)
              reject(new Error(data.error))
            } else {
              console.log(`Warmup workflow completed successfully for instance ${instance.id}`)
              resolve()
            }
          }
        }
        
        // Listen for the return event
        instance.socket.on('return', handleReturn)
        
        // Send the warmup workflow
        instance.socket.emit('run', {
          taskId: taskId,
          name: 'my-workflow-name', // TODO: Add the name of the workflow to warmup
          params: { // TODO: Add any parameters the workflow might need
            sampler: {
              seed: Math.floor(Math.random() * 10000000000000000),
            }
          }
        })
      })
    }
  }
})

// Start the gateway
gateway.start()
// You would import from the installed package
// const { Gateway, AutoScaler } = require('comfyui-connect-gateway')
// But for a local example, we'll import from the relative path
const { Gateway, AutoScaler } = require('../dist')

const autoScaler = new AutoScaler({
  targetQueueRatio: 2, // Aim for ~2 tasks per instance
  scaleUpThreshold: 3, // Scale up when ratio exceeds 3
  scaleDownThreshold: 0.5, // Scale down when ratio below 0.5
  minInstances: 1, // Never go below 1 instance
  maxInstances: 5, // Never exceed 5 instances
  scaleUpCooldownMs: 60 * 1000, // 1 minute between scale ups
  scaleDownCooldownMs: 2 * 60 * 1000, // 2 minutes between scale downs

  scaleUp: async (count) => {
    console.log(`[AUTOSCALER] Scaling up by ${count} instance(s)`)
    // TODO: Here your scale up implementation
  },

  scaleDown: async (count) => {
    console.log(`[AUTOSCALER] Scaling down by ${count} instance(s)`)
    // TODO: Here your scale down implementation
  }
})

// Configure the gateway with the auto scaler
const gateway = new Gateway({
  port: 8189,
  scripts: {
    onMetricsGathered: async (metricsData) => {
      // Feed metrics to the auto scaler to trigger scaling decisions
      autoScaler.processMetrics(metricsData)
    }
  }
})

// Start the gateway
gateway.start()

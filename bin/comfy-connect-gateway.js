#!/usr/bin/env node

const { Gateway } = require('../dist')

// Parse command line arguments for port
let port = 8189 // Default port
const portArgIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p')
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  port = parseInt(process.argv[portArgIndex + 1], 10)
}

// Create and start the gateway
const gateway = new Gateway({ port })
gateway.start()

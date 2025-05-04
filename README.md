# ⚡ Comfy Connect Gateway

Create a cluster of your [ComfyUI Connect](https://github.com/Good-Dream-Studio/ComfyUI-Connect) instances.

> **WIP Warning** heavy development and not fully battle-tested, this package may contain bugs, please do not use in production for now.

**Key features :**
- **✨ Plug and play** - Simply call the `POST /api/connect/workflows/*` endpoint of the gateway instead of your [ComfyUI Connect](https://github.com/Good-Dream-Studio/ComfyUI-Connect)
- **🔌 Works behind NAT** - Your ComfyUI instances don't need to be directly accessible with IP, they connects directly to the gateway using websocket.
- **🚀 Dashboard** - Follow the load of your ComfyUI instances in the integrated dashboard
- **📈 Prometeus Metrics** - Connect your prometeus to `/metrics` and gather load metrics

![Comfy Connect Gateway Dashboard](https://raw.githubusercontent.com/Good-Dream-Studio/comfy-connect-gateway/refs/heads/main/docs/images/dashboard.png)

## Quick start

Create a new folder for your project

Add the `comfyui-connect-gateway` npm package using your prefered packet manager :

```bash
npm install comfy-connect-gateway
yarn add comfy-connect-gateway
pnpm add comfy-connect-gateway
```

Create a `index.js` file with :

```javascript
const { Gateway } = require('comfyui-connect-gateway');

const gateway = new Gateway({
  port: 8189
});

gateway.start();
```

Run it with `node index.js`

## Usage

Here is more options and features you can use :

```javascript
// Using CommonJS
const { Gateway } = require('comfyui-connect-gateway');

// Using ES Modules
import { Gateway } from 'comfyui-connect-gateway';

// Create a gateway with configuration options
const gateway = new Gateway({
  port: 8189,
  metricsInterval: 10000, // Update metrics every 10 seconds
  script: {} // Custom script configuration
});

// Start the gateway
gateway.start();

// Access the underlying components if needed
const cluster = gateway.getCluster();
const queue = gateway.getQueue();
const dispatcher = gateway.getDispatcher();

// Later, when you want to stop the gateway
gateway.stop();
```

You can populate script object with some hooks, see recipes below, or the [simple log usage example](https://github.com/Good-Dream-Studio/comfy-connect-gateway/blob/main/examples/simple-usage.js)

## Recipe: Warming up instances

Using the `script` configuration object, you can send a warmup workflow to run at instance connect.

[See the example](https://github.com/Good-Dream-Studio/comfy-connect-gateway/blob/main/examples/warmup.js)

## Recipe: Auto Scaler

The gateway includes an Auto Scaler feature for helping you building a scale up / down strategy for your cluster.

[See the example](https://github.com/Good-Dream-Studio/comfy-connect-gateway/blob/main/examples/auto-scaling.js)

**Auto Scaler Features**
- **Dynamic Scaling**: Automatically scales instances up or down based on queue size
- **Configurable Thresholds**: Set your preferred queue-to-instance ratios
- **Cooldown Periods**: Prevents rapid scaling up and down
- **Min/Max Constraints**: Set boundaries for scaling operations

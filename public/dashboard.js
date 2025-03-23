/**
 * Dashboard entry point
 *
 * This file is the entry point for the dashboard.
 * It initializes and mounts the Vue app.
 */

document.addEventListener('DOMContentLoaded', function () {
  // Initialize the application
  const app = Dashboard.App.init()

  // Mount the app to the #app element
  app.mount('#app')
})

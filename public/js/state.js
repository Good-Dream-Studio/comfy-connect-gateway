/**
 * State management for the dashboard
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create State namespace
Dashboard.State = {
  // Last updated timestamp
  lastUpdated: Vue.ref(null),

  // Loading state
  loading: Vue.ref(true),

  // Flag to track initial load
  initialLoad: Vue.ref(true),

  // Real-time data (consolidated)
  realtime: Vue.ref({
    queue: {
      size: 0,
      maxSize: 0,
      tasks: []
    },
    instances: {
      count: 0,
      instances: []
    },
    pending: {
      count: 0,
      tasks: []
    }
  })
};

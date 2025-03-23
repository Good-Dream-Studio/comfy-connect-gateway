/**
 * State management for the dashboard
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create State namespace
Dashboard.State = {
  // Timeline filtering state
  timelineGroupBy: Vue.ref('day'),

  // Last updated timestamps
  lastUpdated: Vue.ref({
    instances: null,
    queue: null,
    pending: null,
    global: null,
    timeline: null,
    status: null,
    workflows: null,
    durations: null,
    instancesPerf: null,
    latency: null
  }),

  // Loading states
  loading: Vue.ref({
    instances: true,
    queue: true,
    pending: true,
    global: true,
    timeline: true,
    status: true,
    workflows: true,
    durations: true,
    instancesPerf: true,
    latency: true
  }),

  // Real-time data
  realtime: Vue.ref({
    instances: {
      count: 0,
      instances: []
    },
    queue: {
      size: 0,
      maxSize: 0,
      tasks: []
    },
    pending: {
      count: 0,
      tasks: []
    }
  }),

  // Historical data
  history: Vue.ref({
    global: {
      totalTasks: 0,
      successRate: 0,
      averageDuration: 0,
      totalImages: 0
    },
    timeline: [],
    status: {
      successCount: 0,
      failureCount: 0,
      errorDetails: []
    },
    workflows: [],
    durations: [],
    instancesPerf: [],
    latency: {
      averageInitialLatency: 0,
      averageProcessingTime: 0
    }
  }),

  // Chart instances
  charts: Vue.ref({
    timeline: null,
    status: null,
    workflows: null,
    durations: null,
    instancesPerf: null
  }),

  // Flags to track initial loads
  initialLoads: Vue.ref({
    instances: true,
    queue: true,
    pending: true,
    global: true,
    timeline: true,
    status: true,
    workflows: true,
    durations: true,
    instancesPerf: true,
    latency: true
  }),

  // Computed properties
  globalMetricsFormatted: Vue.computed(() => {
    return {
      totalTasks: {
        label: 'Total Tasks',
        value: Dashboard.State.history.value.global.totalTasks.toLocaleString(),
        unit: ''
      },
      successRate: {
        label: 'Success Rate',
        value: Dashboard.State.history.value.global.successRate.toFixed(1),
        unit: '%'
      },
      averageDuration: {
        label: 'Average Duration',
        value: Dashboard.State.history.value.global.averageDuration.toFixed(2),
        unit: 's'
      },
      totalImages: {
        label: 'Total Images Generated',
        value: Dashboard.State.history.value.global.totalImages.toLocaleString(),
        unit: ''
      }
    }
  })
};

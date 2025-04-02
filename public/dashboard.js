/**
 * Dashboard JS - Combined file
 * 
 * This file contains all the JavaScript functionality for the dashboard,
 * consolidated from previously separate files.
 */

// Create dashboard namespace
window.Dashboard = window.Dashboard || {};

/**
 * Utility functions
 */
Dashboard.Utils = {
  /**
   * Format a timestamp into a human-readable "time ago" string
   * @param {number|string} timestamp - The timestamp to format
   * @returns {string} A human-readable string describing how long ago the timestamp was
   */
  timeAgo: function(timestamp) {
    if (!timestamp) return 'n/a';

    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (isNaN(seconds)) return 'Invalid date';

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  },

  /**
   * Format bytes to a human-readable string with appropriate units
   * @param {number} bytes - The number of bytes to format
   * @returns {string} A formatted string with appropriate units (B, KB, MB, GB)
   */
  formatBytes: function(bytes) {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

/**
 * State management
 */
Dashboard.State = {
  // Last updated timestamp
  lastUpdated: Vue.ref(null),

  // Loading state
  loading: Vue.ref(true),

  // Flag to track initial load
  initialLoad: Vue.ref(true),

  // System status data (consolidated)
  status: Vue.ref({
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

/**
 * API functions
 */
Dashboard.API = {
  /**
   * Fetch all status data in a single request
   */
  fetchAll: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoad.value) {
        Dashboard.State.loading.value = true;
      }

      const response = await axios.get('/api/status');
      
      // Update all state data at once
      Dashboard.State.status.value = response.data;
      Dashboard.State.lastUpdated.value = new Date();
      Dashboard.State.initialLoad.value = false;
    } catch (error) {
      console.error('Error fetching status data:', error);
    } finally {
      Dashboard.State.loading.value = false;
    }
  }
};

/**
 * Interval management
 */
Dashboard.Intervals = {
  // Interval reference
  statusInterval: null,

  /**
   * Setup refresh intervals for status data
   */
  setup: function() {
    // Clear existing intervals
    this.cleanup();

    // Setup new interval for consolidated status data
    this.statusInterval = setInterval(() => {
      Dashboard.API.fetchAll();
    }, 500);
  },

  /**
   * Clean up intervals (called on component unmount)
   */
  cleanup: function() {
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.statusInterval = null;
  }
};

/**
 * Main Vue app setup
 */
Dashboard.App = {
  /**
   * Initialize the dashboard Vue application
   */
  init: function() {
    const app = Vue.createApp({
      setup() {
        // Handle component mount
        Vue.onMounted(() => {
          // Fetch initial data
          Dashboard.API.fetchAll();
          
          // Setup refresh intervals
          Dashboard.Intervals.setup();
        });

        // Get temperature color - green for cool, yellow for warm, red for hot
        const getTempColor = (temp) => {
          if (temp < 60) return '#10B981'; // Green
          if (temp < 70) return '#F59E0B'; // Amber
          return '#EF4444'; // Red
        };

        // Get color for load and memory percentages
        const getPercentageColor = (percentage) => {
          if (percentage < 50) return '#10B981'; // Green
          if (percentage < 80) return '#F59E0B'; // Amber
          return '#EF4444'; // Red
        };

        // Return all necessary state and methods to the template
        return {
          // State - consolidated data
          lastUpdated: Dashboard.State.lastUpdated,
          loading: Dashboard.State.loading,
          status: Dashboard.State.status,
          
          // Utility methods
          timeAgo: Dashboard.Utils.timeAgo,
          formatBytes: Dashboard.Utils.formatBytes,
          getTempColor: getTempColor,
          getPercentageColor: getPercentageColor,
          
          // Data fetching methods
          refreshAll: function() {
            Dashboard.API.fetchAll();
          }
        };
      }
    });

    return app;
  }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  const app = Dashboard.App.init();
  app.mount('#app');
});

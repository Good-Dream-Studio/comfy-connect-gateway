/**
 * Interval management for dashboard updates
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Add intervals management
Dashboard.Intervals = {
  // Interval reference
  realtimeInterval: null,

  /**
   * Setup refresh intervals for real-time data
   * This now uses the consolidated endpoint
   */
  setup: function() {
    // Clear existing intervals
    this.cleanup();

    // Setup new interval for consolidated realtime data
    this.realtimeInterval = setInterval(() => {
      Dashboard.API.Realtime.fetchAll();
    }, 1000);
  },

  /**
   * Clean up intervals (called on component unmount)
   */
  cleanup: function() {
    if (this.realtimeInterval) clearInterval(this.realtimeInterval);
    this.realtimeInterval = null;
  }
};

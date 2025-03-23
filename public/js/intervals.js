/**
 * Interval management for dashboard updates
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Add intervals management
Dashboard.Intervals = {
  // Interval references
  realtimeInterval: null,
  historyInterval: null,

  /**
   * Setup refresh intervals for real-time and historical data
   */
  setup: function() {
    // Clear existing intervals
    this.cleanup();

    // Setup new intervals
    this.realtimeInterval = setInterval(() => {
      Dashboard.API.Realtime.fetchAll();
    }, 1000);

    Dashboard.API.Historical.fetchAll();

    // The refresh is completely messed up, so we are not using it for now, thanks Cline ...
    /*
    this.historyInterval = setInterval(() => {
      Dashboard.API.Historical.fetchAll();
    }, 5000);
    */
  },

  /**
   * Clean up intervals (called on component unmount)
   */
  cleanup: function() {
    if (this.realtimeInterval) clearInterval(this.realtimeInterval);
    if (this.historyInterval) clearInterval(this.historyInterval);
    
    this.realtimeInterval = null;
    this.historyInterval = null;
  }
};

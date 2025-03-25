/**
 * Main Vue app setup for the dashboard
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Add app functionality
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
          Dashboard.API.Realtime.fetchAll();
          
          // Setup refresh intervals
          Dashboard.Intervals.setup();
        });

        // Return all necessary state and methods to the template
        return {
          // State - now simplified with consolidated data
          lastUpdated: Dashboard.State.lastUpdated,
          loading: Dashboard.State.loading,
          realtime: Dashboard.State.realtime,
          
          // Utility methods
          timeAgo: Dashboard.Utils.timeAgo,
          
          // Data fetching methods
          refreshAll: function() {
            Dashboard.API.Realtime.fetchAll();
          }
        };
      }
    });

    return app;
  }
};

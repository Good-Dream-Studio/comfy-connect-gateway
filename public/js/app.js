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
        // Setup watchers for timeline group by changes
        Vue.watch(Dashboard.State.timelineGroupBy, () => {
          Dashboard.API.Historical.fetchTimeline();
        });

        // Handle component mount
        Vue.onMounted(() => {
          // Fetch initial data
          Dashboard.API.Realtime.fetchAll();
          Dashboard.API.Historical.fetchAll();
          
          // Setup refresh intervals
          Dashboard.Intervals.setup();
        });

        // Return all necessary state and methods to the template
        return {
          // State
          timelineGroupBy: Dashboard.State.timelineGroupBy,
          lastUpdated: Dashboard.State.lastUpdated,
          loading: Dashboard.State.loading,
          realtime: Dashboard.State.realtime,
          history: Dashboard.State.history,
          globalMetricsFormatted: Dashboard.State.globalMetricsFormatted,
          
          // Utility methods
          timeAgo: Dashboard.Utils.timeAgo,
          
          // Data fetching methods
          refreshAll: function() {
            Dashboard.API.Realtime.fetchAll();
            Dashboard.API.Historical.fetchAll();
          },
          fetchTimeline: Dashboard.API.Historical.fetchTimeline
        };
      }
    });

    return app;
  }
};

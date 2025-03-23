/**
 * API functions for fetching historical data
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create API namespace if it doesn't exist
Dashboard.API = Dashboard.API || {};

// Add historical API namespace
Dashboard.API.Historical = {
  /**
   * Fetch global metrics data
   */
  fetchGlobalMetrics: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.global) {
        Dashboard.State.loading.value.global = true;
      }

      const response = await axios.get('/api/stats/global');
      Dashboard.State.history.value.global = response.data;
      Dashboard.State.lastUpdated.value.global = new Date();
      Dashboard.State.initialLoads.value.global = false;
    } catch (error) {
      console.error('Error fetching global metrics:', error);
    } finally {
      Dashboard.State.loading.value.global = false;
    }
  },

  /**
   * Fetch timeline data
   */
  fetchTimeline: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.timeline) {
        Dashboard.State.loading.value.timeline = true;
      }

      const response = await axios.get(`/api/stats/timeline?groupBy=${Dashboard.State.timelineGroupBy.value}`);
      Dashboard.State.history.value.timeline = response.data;
      Dashboard.State.lastUpdated.value.timeline = new Date();
      Dashboard.Charts.Timeline.update();
      Dashboard.State.initialLoads.value.timeline = false;
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      Dashboard.State.loading.value.timeline = false;
    }
  },

  /**
   * Fetch status breakdown data
   */
  fetchStatus: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.status) {
        Dashboard.State.loading.value.status = true;
      }

      const response = await axios.get('/api/stats/status');
      Dashboard.State.history.value.status = response.data;
      Dashboard.State.lastUpdated.value.status = new Date();
      Dashboard.Charts.Status.update();
      Dashboard.State.initialLoads.value.status = false;
    } catch (error) {
      console.error('Error fetching status breakdown:', error);
    } finally {
      Dashboard.State.loading.value.status = false;
    }
  },

  /**
   * Fetch workflows distribution data
   */
  fetchWorkflows: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.workflows) {
        Dashboard.State.loading.value.workflows = true;
      }

      const response = await axios.get('/api/stats/workflows');
      Dashboard.State.history.value.workflows = response.data;
      Dashboard.State.lastUpdated.value.workflows = new Date();
      Dashboard.Charts.Workflows.update();
      Dashboard.State.initialLoads.value.workflows = false;
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      Dashboard.State.loading.value.workflows = false;
    }
  },

  /**
   * Fetch task durations data
   */
  fetchDurations: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.durations) {
        Dashboard.State.loading.value.durations = true;
      }

      const response = await axios.get('/api/stats/durations');
      Dashboard.State.history.value.durations = response.data;
      Dashboard.State.lastUpdated.value.durations = new Date();
      Dashboard.Charts.Durations.update();
      Dashboard.State.initialLoads.value.durations = false;
    } catch (error) {
      console.error('Error fetching durations:', error);
    } finally {
      Dashboard.State.loading.value.durations = false;
    }
  },

  /**
   * Fetch instance performance data
   */
  fetchInstancesPerf: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.instancesPerf) {
        Dashboard.State.loading.value.instancesPerf = true;
      }

      const response = await axios.get('/api/stats/instances');
      Dashboard.State.history.value.instancesPerf = response.data;
      Dashboard.State.lastUpdated.value.instancesPerf = new Date();
      Dashboard.Charts.Instances.update();
      Dashboard.State.initialLoads.value.instancesPerf = false;
    } catch (error) {
      console.error('Error fetching instance performance:', error);
    } finally {
      Dashboard.State.loading.value.instancesPerf = false;
    }
  },

  /**
   * Fetch all historical data
   */
  fetchAll: function() {
    this.fetchGlobalMetrics();
    this.fetchTimeline();
    this.fetchStatus();
    this.fetchWorkflows();
    this.fetchDurations();
    this.fetchInstancesPerf();
  }
};

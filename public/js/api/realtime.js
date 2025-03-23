/**
 * API functions for fetching real-time data
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create API namespace if it doesn't exist
Dashboard.API = Dashboard.API || {};

// Add realtime API namespace
Dashboard.API.Realtime = {
  /**
   * Fetch connected instances data
   */
  fetchInstances: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.instances) {
        Dashboard.State.loading.value.instances = true;
      }

      const response = await axios.get('/api/realtime/instances');
      Dashboard.State.realtime.value.instances = response.data;
      Dashboard.State.lastUpdated.value.instances = new Date();
      Dashboard.State.initialLoads.value.instances = false;
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      Dashboard.State.loading.value.instances = false;
    }
  },

  /**
   * Fetch task queue data
   */
  fetchQueue: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.queue) {
        Dashboard.State.loading.value.queue = true;
      }

      const response = await axios.get('/api/realtime/queue');
      Dashboard.State.realtime.value.queue = response.data;
      Dashboard.State.lastUpdated.value.queue = new Date();
      Dashboard.State.initialLoads.value.queue = false;
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      Dashboard.State.loading.value.queue = false;
    }
  },

  /**
   * Fetch pending tasks data
   */
  fetchPending: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoads.value.pending) {
        Dashboard.State.loading.value.pending = true;
      }

      const response = await axios.get('/api/realtime/pending');
      Dashboard.State.realtime.value.pending = response.data;
      Dashboard.State.lastUpdated.value.pending = new Date();
      Dashboard.State.initialLoads.value.pending = false;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    } finally {
      Dashboard.State.loading.value.pending = false;
    }
  },

  /**
   * Fetch all real-time data
   */
  fetchAll: function() {
    this.fetchInstances();
    this.fetchQueue();
    this.fetchPending();
  }
};

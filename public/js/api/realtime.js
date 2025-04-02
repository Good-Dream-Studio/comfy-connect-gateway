/**
 * API functions for fetching system status data
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create API namespace if it doesn't exist
Dashboard.API = Dashboard.API || {};

// Add status API namespace
Dashboard.API.Status = {
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

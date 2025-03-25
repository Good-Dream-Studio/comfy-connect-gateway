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
   * Fetch all real-time data in a single request
   */
  fetchAll: async function() {
    try {
      // Only show loader on initial load
      if (Dashboard.State.initialLoad.value) {
        Dashboard.State.loading.value = true;
      }

      const response = await axios.get('/api/realtime');
      
      // Update all state data at once
      Dashboard.State.realtime.value = response.data;
      Dashboard.State.lastUpdated.value = new Date();
      Dashboard.State.initialLoad.value = false;
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    } finally {
      Dashboard.State.loading.value = false;
    }
  }
};

/**
 * Utility functions for the dashboard
 */

// Create dashboard namespace if it doesn't exist
window.Dashboard = window.Dashboard || {};

// Add utils namespace
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
  }
};

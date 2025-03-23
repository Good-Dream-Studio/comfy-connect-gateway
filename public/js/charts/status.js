/**
 * Status chart functionality
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create Charts namespace if it doesn't exist
Dashboard.Charts = Dashboard.Charts || {};

// Add status chart functionality
Dashboard.Charts.Status = {
  /**
   * Update the status chart with the current data
   */
  update: function() {
    if (!Dashboard.State.history.value.status) return;

    const ctx = document.getElementById('statusChart');

    if (!ctx) return;

    // Ensure we have the necessary properties before proceeding
    const successCount = Dashboard.State.history.value.status.successCount || 0;
    const failureCount = Dashboard.State.history.value.status.failureCount || 0;

    // Check if chart already exists and destroy it to prevent memory leaks
    try {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
    } catch (error) {
      console.warn('Error checking for existing chart:', error);
      // Proceed with creating a new chart
    }

    if (Dashboard.State.charts.value.status) {
      Dashboard.State.charts.value.status.data.datasets[0].data = [successCount, failureCount];
      Dashboard.State.charts.value.status.update('none'); // Use 'none' to prevent animation
    } else {
      Dashboard.State.charts.value.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Success', 'Failure'],
          datasets: [
            {
              data: [successCount, failureCount],
              backgroundColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }
};

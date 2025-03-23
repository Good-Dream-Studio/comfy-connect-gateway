/**
 * Timeline chart functionality
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create Charts namespace if it doesn't exist
Dashboard.Charts = Dashboard.Charts || {};

// Add timeline chart functionality
Dashboard.Charts.Timeline = {
  /**
   * Update the timeline chart with the current data
   */
  update: function() {
    // Reference state directly from the Dashboard namespace
    if (!Dashboard.State.history.value.timeline || Dashboard.State.history.value.timeline.length === 0) return;

    const ctx = document.getElementById('timelineChart');

    if (!ctx) return;

    // Format labels based on groupBy
    const labels = [...Dashboard.State.history.value.timeline.map((item) => item.time)];
    const data = [...Dashboard.State.history.value.timeline.map((item) => item.count)];

    // Always destroy previous chart instance to prevent memory leaks and recursion issues
    try {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
        Dashboard.State.charts.value.timeline = null;
      }
    } catch (error) {
      console.warn('Error checking for existing timeline chart:', error);
      // Proceed with creating a new chart
    }

    // Create a new chart instance each time
    Dashboard.State.charts.value.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tasks Received',
            data: data,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label
              }
            }
          }
        }
      }
    });
  }
};

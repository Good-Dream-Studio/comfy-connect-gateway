/**
 * Workflows chart functionality
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create Charts namespace if it doesn't exist
Dashboard.Charts = Dashboard.Charts || {};

// Add workflows chart functionality
Dashboard.Charts.Workflows = {
  /**
   * Update the workflows chart with the current data
   */
  update: function() {
    if (!Dashboard.State.history.value.workflows || Dashboard.State.history.value.workflows.length === 0) return;

    const ctx = document.getElementById('workflowsChart');

    if (!ctx) return;

    const labels = [...Dashboard.State.history.value.workflows.map((item) => item.workflowName)];
    const data = [...Dashboard.State.history.value.workflows.map((item) => item.count)];

    // Generate colors
    const backgroundColors = labels.map((_, i) => {
      const hue = (i * 137) % 360; // Golden angle approximation
      return `hsl(${hue}, 70%, 60%)`;
    });

    // Check if chart already exists and destroy it to prevent memory leaks
    try {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
    } catch (error) {
      console.warn('Error checking for existing workflows chart:', error);
      // Proceed with creating a new chart
    }

    if (Dashboard.State.charts.value.workflows) {
      Dashboard.State.charts.value.workflows.data.labels = labels;
      Dashboard.State.charts.value.workflows.data.datasets[0].data = data;
      Dashboard.State.charts.value.workflows.data.datasets[0].backgroundColor = backgroundColors;
      Dashboard.State.charts.value.workflows.update('none'); // Use 'none' to prevent animation
    } else {
      Dashboard.State.charts.value.workflows = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: backgroundColors,
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12
              }
            }
          }
        }
      });
    }
  }
};

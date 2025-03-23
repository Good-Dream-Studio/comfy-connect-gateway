/**
 * Durations chart functionality
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create Charts namespace if it doesn't exist
Dashboard.Charts = Dashboard.Charts || {};

// Add durations chart functionality
Dashboard.Charts.Durations = {
  /**
   * Update the durations chart with the current data
   */
  update: function() {
    if (!Dashboard.State.history.value.durations || Dashboard.State.history.value.durations.length === 0) return;

    const ctx = document.getElementById('durationsChart');

    if (!ctx) return;

    // Calculate histogram data
    const durations = [...Dashboard.State.history.value.durations];

    // Make sure we have data to process
    if (durations.length === 0) return;

    // Find min and max
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    // Create bins
    const binCount = 10;
    const binWidth = (max - min) / binCount || 1; // Prevent division by zero
    const bins = Array(binCount).fill(0);
    const binLabels = [];

    // Create bin labels
    for (let i = 0; i < binCount; i++) {
      const start = min + i * binWidth;
      const end = min + (i + 1) * binWidth;
      binLabels.push(`${start.toFixed(1)}s - ${end.toFixed(1)}s`);
    }

    // Fill bins
    durations.forEach((duration) => {
      // Handle edge case for max value
      if (duration === max) {
        bins[binCount - 1]++;
        return;
      }

      const binIndex = Math.floor((duration - min) / binWidth);
      // Handle any potential out of bounds index
      if (binIndex >= 0 && binIndex < binCount) {
        bins[binIndex]++;
      }
    });

    // Check if chart already exists and destroy it to prevent memory leaks
    try {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
    } catch (error) {
      console.warn('Error checking for existing durations chart:', error);
      // Proceed with creating a new chart
    }

    if (Dashboard.State.charts.value.durations) {
      Dashboard.State.charts.value.durations.data.labels = binLabels;
      Dashboard.State.charts.value.durations.data.datasets[0].data = bins;
      Dashboard.State.charts.value.durations.update('none'); // Use 'none' to prevent animation
    } else {
      Dashboard.State.charts.value.durations = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: binLabels,
          datasets: [
            {
              label: 'Count',
              data: bins,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1
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
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function (tooltipItems) {
                  return tooltipItems[0].label;
                },
                label: function (context) {
                  return `Count: ${context.raw}`;
                }
              }
            }
          }
        }
      });
    }
  }
};

/**
 * Instances performance chart functionality
 */

// Extend the Dashboard namespace
window.Dashboard = window.Dashboard || {};

// Create Charts namespace if it doesn't exist
Dashboard.Charts = Dashboard.Charts || {};

// Add instances chart functionality
Dashboard.Charts.Instances = {
  /**
   * Update the instances performance chart with the current data
   */
  update: function() {
    if (!Dashboard.State.history.value.instancesPerf || Dashboard.State.history.value.instancesPerf.length === 0) return;

    const ctx = document.getElementById('instancesPerfChart');

    if (!ctx) return;

    // Get top 10 instances by task count
    const topInstances = [...Dashboard.State.history.value.instancesPerf]
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 10);

    // If no instances data, return
    if (topInstances.length === 0) return;

    const labels = topInstances.map((item) => {
      const id = item.instanceId;
      return id.length > 8 ? id.substring(0, 8) + '...' : id;
    });

    const data = [...topInstances.map((item) => item.taskCount)];
    const avgDurations = [...topInstances.map((item) => item.averageDuration || 0)];

    // Check if chart already exists and destroy it to prevent memory leaks
    try {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
    } catch (error) {
      console.warn('Error checking for existing instances performance chart:', error);
      // Proceed with creating a new chart
    }

    if (Dashboard.State.charts.value.instancesPerf) {
      Dashboard.State.charts.value.instancesPerf.data.labels = labels;
      Dashboard.State.charts.value.instancesPerf.data.datasets[0].data = data;
      Dashboard.State.charts.value.instancesPerf.data.datasets[1].data = avgDurations;
      Dashboard.State.charts.value.instancesPerf.update('none'); // Use 'none' to prevent animation
    } else {
      Dashboard.State.charts.value.instancesPerf = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Tasks Performed',
              data: data,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'Avg Duration (s)',
              data: avgDurations,
              backgroundColor: 'rgba(248, 113, 113, 0.6)',
              borderColor: 'rgb(248, 113, 113)',
              borderWidth: 1,
              type: 'line',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Tasks Count'
              },
              ticks: {
                precision: 0
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              title: {
                display: true,
                text: 'Avg Duration (s)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          },
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

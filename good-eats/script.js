if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    // Function to check for service worker updates
    function checkForUpdate() {
      reg.update().then(() => {
        reg.installing || reg.waiting || reg.active.update();
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              displayUpdateNotification();
            }
          };
        };
      });
    }

    // Display update notification
    function displayUpdateNotification() {
      const menu = document.getElementById('settings-menu');
      const updateDiv = document.createElement('div');
      updateDiv.innerHTML = `<br><button onclick="updateApp()" style="color: red; border-color: red;">Update app</button></div>`;
      menu.appendChild(updateDiv);

      document.querySelector('#settings-toggle').classList.add('show');
    }
    
    // Call the update function periodically
    setInterval(checkForUpdate, 60000); // Check every 60 seconds

    window.updateApp = () => {
      reg.waiting.postMessage('skipWaiting');
      window.location.reload();
    };

    // Ensure the new service worker takes control immediately
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });
  });
}


let calorieChartInstance; 

document.addEventListener('DOMContentLoaded', () => {
  const datePicker = document.getElementById('datePicker');
  const today = new Date().toISOString().split('T')[0];
  datePicker.value = today;
  document.getElementById('currentDay').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });

  generateCalorieChart();
  updateCalorieList(today);

  datePicker.addEventListener('change', (e) => {
    const selectedDate = e.target.value;
    updateCalorieList(selectedDate);
  });

  document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
  document.getElementById('nextDay').addEventListener('click', () => changeDate(1));

  createCalorieButtons();

  document.getElementById('calorieInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
      event.preventDefault();
      submitCalories();
    }
  });

  document.addEventListener('mousedown', function(event) {
    var settingsMenu = document.getElementById('settings-menu');
    if (!settingsMenu.contains(event.target)) {
      settingsMenu.style.display = 'none';
    }
  });
  
  populateGoals();
});

function populateGoals() {
  const maxGoal = localStorage.getItem('maxGoal') || 10000;
  const minGoal = localStorage.getItem('minGoal') || 0;

  document.getElementById('max-goal').value = maxGoal;
  document.getElementById('min-goal').value = minGoal;
}

function changeDate(offset) {
  const datePicker = document.getElementById('datePicker') || new Date().toISOString().split('T')[0];
  const currentDate = new Date(datePicker.value);
  currentDate.setDate(currentDate.getDate() + offset);
  datePicker.value = currentDate.toISOString().split('T')[0];
  document.getElementById('currentDay').textContent = currentDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
  updateCalorieList(datePicker.value);
}

function updateCalorieList(date) {
  const caloriesForDate = JSON.parse(localStorage.getItem(date)) || [];
  const calorieListElement = document.getElementById('calorieList');
  calorieListElement.innerHTML = '';

  let totalCalories = 0;

  caloriesForDate.forEach((calorie, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = calorie;

    // Create and append the delete button
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', function() {
      deleteCalorieEntry(date, index);
    });
    listItem.appendChild(deleteButton);

    calorieListElement.appendChild(listItem);

    totalCalories += parseInt(calorie, 10);
  });

  const maxGoal = parseInt(localStorage.getItem('maxGoal'), 10);
  const minGoal = parseInt(localStorage.getItem('minGoal'), 10);

  const totalCaloriesHeading = document.getElementById('total');
  totalCaloriesHeading.textContent = `Total calories: ${totalCalories}`;

  if (totalCalories >= minGoal && totalCalories <= maxGoal) {
    totalCaloriesHeading.style.color = 'lightgreen';
  } else {
    totalCaloriesHeading.style.color = 'orange';
  }

  updateChart();
}

function deleteCalorieEntry(date, index) {
  let caloriesForDate = JSON.parse(localStorage.getItem(date)) || [];
  caloriesForDate.splice(index, 1);
  localStorage.setItem(date, JSON.stringify(caloriesForDate));
  updateCalorieList(date);
}


function submitCalories() {
  const calorieValue = document.getElementById('calorieInput').value;
  if (!calorieValue) return;
  const selectedDate = document.getElementById('datePicker').value || new Date().toISOString().split('T')[0];

  const existingCalories = JSON.parse(localStorage.getItem(selectedDate)) || [];

  existingCalories.push(calorieValue);

  localStorage.setItem(selectedDate, JSON.stringify(existingCalories));

  document.getElementById('calorieInput').value = '';

  updateCalorieList(selectedDate);
  createCalorieButtons();

  document.querySelector('#logged-popup').style.display = "block";
  setTimeout(() => {
    document.querySelector('#logged-popup').style.display = "none";
  }, 700);
}



function getMostCommonCalories() {
  const allEntries = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    let entries = JSON.parse(localStorage.getItem(key));

    if (Array.isArray(entries)) {
      allEntries.push(...entries);
    } else if (entries !== null && entries !== undefined) {
      allEntries.push(entries);
    }
  }

  const calorieCount = allEntries.reduce((acc, val) => {
    if (typeof val === 'string' || typeof val === 'number') {
      acc[val] = (acc[val] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedCalories = Object.entries(calorieCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sortedCalories.map(item => [+item[0], item[1]])
  .sort((a, b) => a[0] - b[0])
  .map(item => item[0].toString());
}


function createCalorieButtons() {
  const topCalories = getMostCommonCalories();
  const quickselectContainer = document.getElementById('quickselect-buttons');
  quickselectContainer.innerHTML = "";

  topCalories.forEach(value => {
    const button = document.createElement('button');
    button.classList.add('quickselect');
    button.textContent = value;
    button.addEventListener('click', () => {
      document.getElementById('calorieInput').value = value;
      submitCalories();
    });
    quickselectContainer.appendChild(button);
  });
}

function toggleSettings() {
  const settingsMenu = document.querySelector('#settings-menu');
  if (settingsMenu.style.display === 'flex') {
      settingsMenu.style.display = 'none';
  } else {
      settingsMenu.style.display = 'flex';
  }
}

function saveGoals() {
  const maxGoal = document.getElementById('max-goal').value || "10000";
  const minGoal = document.getElementById('min-goal').value || "0";
  localStorage.setItem('maxGoal', maxGoal);
  localStorage.setItem('minGoal', minGoal);
  changeDate(0);
}

function generateCalorieChart() {
  const ctx = document.getElementById('calorieChart').getContext('2d');
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const calorieData = last7Days.map(date => {
    const caloriesForDate = JSON.parse(localStorage.getItem(date)) || [];
    return caloriesForDate.reduce((acc, val) => acc + parseInt(val, 10), 0);
  });

  const maxGoal = parseInt(localStorage.getItem('maxGoal'), 10) || 0;
  const minGoal = parseInt(localStorage.getItem('minGoal'), 10) || 0;

    if (calorieChartInstance) {
      calorieChartInstance.destroy(); // Destroy the existing chart instance before creating a new one
    }
    calorieChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Total Calories',
        data: calorieData,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }, {
        label: 'Max Goal',
        data: new Array(7).fill(maxGoal),
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }, {
        label: 'Min Goal',
        data: new Array(7).fill(minGoal),
        borderColor: 'rgb(54, 162, 235)',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: false,
          grid: {
            display: false
          }
        },
        y: {
          display: false,
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateChart() {
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const calorieData = last7Days.map(date => {
    const caloriesForDate = JSON.parse(localStorage.getItem(date)) || [];
    return caloriesForDate.reduce((acc, val) => acc + parseInt(val, 10), 0);
  });

  const maxGoal = parseInt(localStorage.getItem('maxGoal'), 10) || 0;
  const minGoal = parseInt(localStorage.getItem('minGoal'), 10) || 0;

  calorieChartInstance.data.labels = last7Days;
  calorieChartInstance.data.datasets[0].data = calorieData;
  calorieChartInstance.data.datasets[1].data = new Array(7).fill(maxGoal);
  calorieChartInstance.data.datasets[2].data = new Array(7).fill(minGoal);
  calorieChartInstance.update();
}
// PTO definitions
const PTOs = [
  { name: "PTO 1", r_body: [5, 0, 0], anchor: [10, 0, -10] },
  { name: "PTO 2", r_body: [-5, 2.5, 0], anchor: [-10, 5, -10] },
  { name: "PTO 3", r_body: [-5, -2.5, 0], anchor: [-10, -5, -10] }
];

// State variables
let v_imu = [0, 0, 0];
let lastTimestamp = null;

// Chart setup
const charts = [];
const colors = ['#ffcc00', '#00cc99', '#33cccc'];
const maxPoints = 100;

// Battery setup
const batteryLevel = document.getElementById("batteryLevel");
const batteryStatus = document.getElementById("batteryStatus");
const infoPanel = document.getElementById("infoPanel");
const batteryCapacity = 15.0; // kWh
let batteryCharge = 0.0;

// Initialize charts
for (let i = 0; i < 3; i++) {
  const ctx = document.getElementById(`chart${i+1}`).getContext('2d');
  charts.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: colors[i],
        fill: false,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          suggestedMax: 2,
          title: { display: true, text: 'Power (kW)' }
        }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: PTOs[i].name
        }
      }
    }
  }));
}

function updateBatteryDisplay() {
  const level = (batteryCharge / batteryCapacity) * 100;
  batteryLevel.style.width = level + "%";
  batteryLevel.style.backgroundColor =
    level < 30 ? 'red' : level < 70 ? 'orange' : 'green';
  batteryStatus.textContent =
    `${batteryCharge.toFixed(2)} / ${batteryCapacity.toFixed(1)} kWh`;
}

function resetBattery() {
  batteryCharge = 0;
  updateBatteryDisplay();
  charts.forEach(chart => {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  });
}

// Vector helpers
function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}

function norm(v) {
  return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function unit(v) {
  let n = norm(v);
  return n > 1e-9 ? v.map(x => x / n) : [0,0,0];
}

// Live data fetcher
async function fetchData() {
  try {
    const res = await fetch('http://localhost:3000/data'); // proxy to ESP32
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    const q = data.q;      // quaternion [w,x,y,z]
    const acc_body = data.acc;
    const gyr_body = data.gyr; // rad/s
    const dt = data.dt || 0.05;

    const beltRates = [];

    for (let i = 0; i < PTOs.length; i++) {
        const p_pto = PTOs[i].r_body;
        const dir = unit(PTOs[i].anchor.map((a, idx) => a - p_pto[idx]));

        const vel = cross(gyr_body, p_pto);
        let rate = vel[0]*dir[0] + vel[1]*dir[1] + vel[2]*dir[2];
        if (rate < 0) rate = 0;
        beltRates.push(rate);

        const chart = charts[i];
        chart.data.datasets[0].data.push(rate);
        chart.data.labels.push('');
        if (chart.data.datasets[0].data.length > maxPoints) {
            chart.data.datasets[0].data.shift();
            chart.data.labels.shift();
        }
        chart.update();
    }

    const totalBeltRate = beltRates.reduce((sum, rate) => sum + rate, 0);
    const energy = totalBeltRate * (dt / 3600);
    batteryCharge += energy;
    if (batteryCharge > batteryCapacity) batteryCharge = batteryCapacity;
    updateBatteryDisplay();

    infoPanel.textContent = `Belt Rates (m/s):\n` +
      PTOs.map((p,i) => `${p.name}: ${beltRates[i].toFixed(3)}`).join('\n');

  } catch (err) {
    infoPanel.textContent = "Error fetching data:\n" + err.message;
  }
}

setInterval(fetchData, 50);


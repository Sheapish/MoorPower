// PTO definitions
const PTOs = [
  { name: "PTO 1" },
  { name: "PTO 2" },
  { name: "PTO 3" }
];

// Chart setup
const charts = [];
const colors = ['#FFB112','#17BD8E','#02B1D3'];
const maxPoints = 80;

for(let i=0;i<3;i++){
  const ctx = document.getElementById(`chart${i}`).getContext('2d');
  charts.push(new Chart(ctx, {
    type:'line',
    data:{ labels:[], datasets:[{ data:[], borderColor:colors[i], fill:false, pointRadius:0 }] },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      scales:{
        x:{ display:false },
        y: {
          title: {
            display: true,
            text: 'Power (kW)',
            font: {
              size: 18,        
              weight: 'bold'
            },
            color: '#fff'
          },
          beginAtZero: true
        }
      },
      plugins:{
        legend:{ display:false },
        title:{ display:true, text:PTOs[i].name, font: {size: 18, weight: 'bold'}, color:'#fff' }
      }
    }
  }));
}

// Battery
const batteryLevel = document.getElementById("batteryLevel");
const batteryStatus = document.getElementById("batteryStatus");
let batteryCharge = 0;
const batteryCapacity = 0.15;

function updateBatteryDisplay() {
  const level = Math.min(100, (batteryCharge / batteryCapacity) * 100);
  batteryLevel.style.height = level + "%"; 
  batteryStatus.textContent = `${Math.round(level)}%`; 
}

function resetBattery(){
  batteryCharge = 0;
  updateBatteryDisplay();
  charts.forEach(chart=>{
    chart.data.labels=[];
    chart.data.datasets[0].data=[];
    chart.update();
  });
}

// WebSocket
let ws;
function connectWS(){
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = ()=>console.log("WebSocket connected");
  ws.onclose = ()=>setTimeout(connectWS,2000);
  ws.onerror = (err)=>console.error("WebSocket error",err);

  ws.onmessage = (event)=>{
    try{
      const data = JSON.parse(event.data);
      if(!data.rates || data.rates.length!==3) return;

      let totalRate = 0;
      data.rates.forEach((rate,i)=>{
        if(rate < 1) rate = 0;
        totalRate += rate;

        const chart = charts[i];
        chart.data.datasets[0].data.push(rate);
        chart.data.labels.push('');
        if(chart.data.datasets[0].data.length>maxPoints){
          chart.data.datasets[0].data.shift();
          chart.data.labels.shift();
        }
        chart.update();
      });

      // Update battery (kWh)
      const dt = data.dt || 0.05;
      batteryCharge += totalRate * (dt/3600);
      if(batteryCharge>batteryCapacity) batteryCharge = batteryCapacity;
      updateBatteryDisplay();

    } catch(e){ console.error("Failed to parse WS data",e); }
  };
}

connectWS();

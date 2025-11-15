// --- Chart.js setup ---
const ctx1 = document.getElementById('chart1').getContext('2d');
const ctx2 = document.getElementById('chart2').getContext('2d');

const data1 = {
    labels: [],
    datasets: [
        {
            label: 'Prędkość omega [rad/s]',
            data: [],
            borderColor: 'blue',
            fill: false,
            pointRadius: 0
        },
        {
            label: 'Prędkość omega_zadana [rad/s]',
            data: [],
            borderColor: 'red',
            fill: false,
            pointRadius: 0
        },
    ]
};

const data2 = {
    labels: [],
    datasets: [
        {
            label: 'Moment sterujący tau [Nm]',
            data: [],
            borderColor: 'blue',
            fill: false,
            pointRadius: 0
        }
    ]
};

const config1 = {
    type: 'line',
    data: data1,
    options: {
        animation: false,
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Czas [s]' } },
            y: { title: { display: true, text: 'Wartość' } }
        }
    }
};
const config2 = {
    type: 'line',
    data: data2,
    options: {
        animation: false,
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Czas [s]' } },
            y: { title: { display: true, text: 'Wartość' } }
        }
    }
};

const chart1 = new Chart(ctx1, config1);
const chart2 = new Chart(ctx2, config2);

let ws = new WebSocket("ws://localhost:8000/ws");
let t = 0;

const slider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
var omegaSet = 0

slider.addEventListener('change', () => {
    omegaSet = parseFloat(slider.value)
    ws.send(JSON.stringify({omega_set: omegaSet}));
});

slider.addEventListener('input', () => {
    speedVal.innerText = slider.value;
});

ws.onmessage = function(event) {
    const msg = JSON.parse(event.data);
    t += 0.01;

    data1.labels.push(t.toFixed(2));
    data1.datasets[0].data.push(msg.omega);
    data1.datasets[1].data.push(omegaSet);

    data2.labels.push(t.toFixed(2));
    data2.datasets[0].data.push(msg.tau);

    if(data1.labels.length > 2000){
        data1.labels.shift();
        data1.datasets[0].data.shift();
        data1.datasets[1].data.shift();

        data2.labels.shift();
        data2.datasets[0].data.shift();
    }

    chart1.update();
    chart2.update();
};

// ws.onopen = function() {
//     console.log("Połączono z serwerem WebSocket");
// };
//
// ws.onclose = function() {
//     console.log("Rozłączono z serwerem WebSocket");
// };

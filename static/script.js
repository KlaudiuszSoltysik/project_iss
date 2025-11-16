document.addEventListener("DOMContentLoaded", () => {
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
                pointRadius: 0,
                tension: 0.1
            },
            {
                label: 'Prędkość omega_zadana [rad/s]',
                data: [],
                borderColor: 'red',
                fill: false,
                pointRadius: 0,
                borderDash: [5, 5],
                tension: 0.1
            },
        ]
    };
    const data2 = {
        labels: [],
        datasets: [
            {
                label: 'Moment sterujący tau [Nm]',
                data: [],
                borderColor: 'green',
                fill: false,
                pointRadius: 0,
                tension: 0.1
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
                x: {
                    title: {
                        display: true,
                        text: 'Czas [s]'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Wartość'
                    }
                }
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
                x: {
                    title: {
                        display: true,
                        text: 'Czas [s]'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Wartość'
                    }
                }
            }
        }
    };

    const chart1 = new Chart(ctx1, config1);
    const chart2 = new Chart(ctx2, config2);

    const sliders = {
        kp: document.getElementById('kpSlider'),
        ki: document.getElementById('kiSlider'),
        kd: document.getElementById('kdSlider'),
        omegaSet: document.getElementById('omegaSetSlider'),
        b: document.getElementById('bSlider'),
        disturbance: document.getElementById('disturbanceSlider'),
    };
    const labels = {
        kp: document.getElementById('kpVal'),
        ki: document.getElementById('kiVal'),
        kd: document.getElementById('kdVal'),
        omegaSet: document.getElementById('omegaSetVal'),
        b: document.getElementById('bVal'),
        disturbance: document.getElementById('disturbanceVal'),
    };
    const startButton = document.getElementById('startButton');

    const updateLabel = (name) => {
        labels[name].innerText = sliders[name].value;
    };
    for (const key in sliders) {
        sliders[key].addEventListener('input', () => updateLabel(key));
        updateLabel(key); 
    }

    const ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
        console.log("Połączono z WebSocket.");
        startButton.disabled = false;
        startButton.textContent = "Uruchom Symulację";
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'simulation_data') {
                    const payload = msg.payload;

                    data1.labels = payload.time;
                    data1.datasets[0].data = payload.omega;
                    data1.datasets[1].data = new Array(payload.time.length).fill(payload.omega_set);

                    data2.labels = payload.time;
                    data2.datasets[0].data = payload.tau;

                    chart1.update();
                    chart2.update();

                    console.log("Symulacja zakończona. Otrzymano dane.");
                    startButton.disabled = false;
                    startButton.textContent = "Uruchom Symulację";
            }
        }
        catch (e) {
            startButton.disabled = false;
            startButton.textContent = `Błąd symulacji: ${e.message}`;
        }
    };

    ws.onclose = () => {
        console.log("Rozłączono z WebSocket.");
        startButton.disabled = true;
        startButton.textContent = "Rozłączono";
    };

    ws.onerror = (error) => {
        console.error("Błąd WebSocket:", error);
        startButton.disabled = true;
        startButton.textContent = "Błąd Połączenia";
    };

    startButton.addEventListener('click', () => {
        if (ws.readyState === WebSocket.OPEN) {

            const payload = {
                Kp: parseFloat(sliders.kp.value),
                Ki: parseFloat(sliders.ki.value),
                Kd: parseFloat(sliders.kd.value),
                omega_set: parseFloat(sliders.omegaSet.value),
                b: parseFloat(sliders.b.value),
                disturbance: parseFloat(sliders.disturbance.value)
            };

            ws.send(JSON.stringify({ 
                type: 'start_simulation', 
                payload: payload 
            }));

            startButton.disabled = true;
            startButton.textContent = "Symulacja w toku...";
        }
    });

    startButton.disabled = true;
    startButton.textContent = "Łączenie z serwerem...";
});
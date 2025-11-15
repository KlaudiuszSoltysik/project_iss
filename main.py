import json
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

html = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Symulacja Koła - Realtime</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1 style="text-align: center;">Symulacja Koła w czasie rzeczywistym</h1>

    <div style="width: 800px; margin: 0 auto; display: flex; align-items: center; margin-bottom: 20px;">
        <label for="speedSlider" style="width: 200px; margin-right: 10px;">
            Prędkość zadana: <span id="speedVal">0</span> rad/s
        </label>
        <input type="range" id="speedSlider" min="-20" max="20" step="0.1" value="0" style="flex: 1;">
    </div>

    <div style="width: 800px; margin: 0 auto; margin-bottom: 20px;">
        <canvas id="chart1" width="800" height="400" style="display: block; margin: 0 auto;"></canvas>
    </div>

    <div style="width: 800px; margin: 0 auto;">
        <canvas id="chart2" width="800" height="400" style="display: block; margin: 0 auto;"></canvas>
    </div>

    <script src="static/script.js"></script>
</body>
</html>
"""

async def receive_omega_set(websocket, omega_set_container):
    while True:
        try:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            if "omega_set" in data:
                omega_set_container[0] = float(data["omega_set"])
        except Exception as e:
            print("Błąd odbioru:", e)
            break

@app.get("/")
async def get():
    return HTMLResponse(html)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # --- Parametry fizyczne koła ---
    m = 1.0
    r = 0.5
    I = 0.5 * m * r**2

    # --- Tarcie i zakłócenia ---
    b = 0.2
    disturbance = 0.3

    # --- PID ---
    Kp = 10.0
    Ki = 15.0
    Kd = 0.05
    integral = 0
    prev_error = 0

    # --- Stan ---
    omega = 0.0
    dt = 0.01

    omega_set_container = [0.0]  # początkowa wartość zadanej prędkości

    asyncio.create_task(receive_omega_set(websocket, omega_set_container))

    while True:
        omega_set = omega_set_container[0]

        # --- PID ---
        error = omega_set - omega
        integral += error * dt
        derivative = (error - prev_error) / dt
        prev_error = error
        tau_pid = Kp * error + Ki * integral + Kd * derivative

        # --- Dynamika koła ---
        domega = (tau_pid - b * omega - disturbance) / I
        omega += domega * dt

        # --- Wyślij przez websocket ---
        try:
            await websocket.send_json({"omega": omega, "tau": tau_pid})
        except:
            break

        await asyncio.sleep(dt)


# uvicorn main:app --reload

import json
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import Request

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
static = Jinja2Templates(directory="static")

@app.get("/", response_class=HTMLResponse)
async def get_root(request: Request):
    return static.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    m = 1.0
    r = 0.5
    I = 0.5 * m * r**2

    while True:
        try:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            if data.get('type') == 'start_simulation':

                params = data.get('payload', {})

                time_data = []
                omega_data = []
                tau_data = []

                omega = 0.0
                integral = 0.0
                prev_error = 0.0
                dt = 0.001
                time = 0.0

                time_data.append(round(time, 2))
                omega_data.append(omega)
                tau_data.append(0)

                for _ in range(20000):
                    error = params.get("omega_set", 0.0) - omega
                    integral += error * dt
                    derivative = (error - prev_error) / dt
                    prev_error = error

                    tau_pid = (params.get("Kp", 0.0) * error +
                               params.get("Ki", 0.0) * integral +
                               params.get("Kd", 0.0) * derivative)

                    domega = (tau_pid - params.get("b", 0.0) * omega - params.get("disturbance", 0.0)) / I
                    omega += domega * dt
                    time += dt

                    time_data.append(round(time, 2))
                    omega_data.append(omega)
                    tau_data.append(tau_pid)

                try:
                    await websocket.send_json({
                        "type": "simulation_data",
                        "payload": {
                            "time": time_data,
                            "omega": omega_data,
                            "tau": tau_data,
                            "omega_set": params.get("omega_set")
                        }
                    })
                except Exception as e:
                    print(f"Błąd wysyłania pakietu danych: {e}")


        except Exception as e:
            print(f"Błąd WebSocket lub rozłączenie: {e}")
            break

# uvicorn main:app --reload

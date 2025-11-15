import json
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import Request

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

async def receive_omega_set(websocket, params):
    while True:
        try:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            for key in params:
                if key in data:
                    params[key] = float(data[key])
        except Exception as e:
            print("Error:", e)
            break

@app.get("/", response_class=HTMLResponse)
async def get_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    m = 1.0
    r = 0.5
    I = 0.5 * m * r**2

    params = {
        "b": 0.0,
        "disturbance": 0.0,
        "Kp": 0.0,
        "Ki": 0.0,
        "Kd": 0.0,
        "omega_set": 0.0
    }

    integral = 0
    prev_error = 0

    omega = 0.0
    dt = 0.1

    asyncio.create_task(receive_omega_set(websocket, params))

    while True:
        error = params["omega_set"] - omega
        integral += error * dt
        derivative = (error - prev_error) / dt
        prev_error = error
        tau_pid = params["Kp"] * error + params["Ki"] * integral + params["Kd"] * derivative

        domega = (tau_pid - params["b"] * omega - params["disturbance"]) / I
        omega += domega * dt

        try:
            await websocket.send_json({"omega": omega, "tau": tau_pid})
        except:
            break

        await asyncio.sleep(dt)


# uvicorn main:app --reload

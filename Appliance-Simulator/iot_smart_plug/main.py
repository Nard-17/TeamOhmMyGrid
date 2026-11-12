"""
main.py - IoT Smart Plug Server & Telemetry Engine
FastAPI + WebSockets + Real MQTT Manager + High-Precision Hardware Emulator
"""

import asyncio
import json
import os
from typing import Dict, Any, Optional, Literal
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .engine.hardware import SmartPlugHardware
from .engine.appliances import APPLIANCE_CATALOG
from .engine.mqtt_manager import SmartPlugMQTTManager

app = FastAPI(
    title="KuryenTipid - IoT Smart Plug Hardware Simulation",
    description="High-fidelity electrical AC physics, ESP32 hardware simulation, and MQTT telemetry engine",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Virtual Hardware Instance
plug_hardware = SmartPlugHardware(device_id="meralco_plug_01", device_name="Smart Plug Pro (ESP32-S3)")
mqtt_engine = SmartPlugMQTTManager(device_id="meralco_plug_01")
mqtt_engine.connect()

# Set up bidirectional MQTT command link
def handle_mqtt_command(cmd: Dict[str, Any]):
    if "relay" in cmd:
        plug_hardware.set_relay(cmd["relay"])
mqtt_engine.command_callback = handle_mqtt_command


class RelayRequest(BaseModel):
    state: str  # "ON", "OFF", or "RESET"


class ProtectionRequest(BaseModel):
    enabled: bool


@app.post('/api/protection')
async def set_protection(req: ProtectionRequest):
    plug_hardware.protection_enabled = req.enabled
    plug_hardware.ocp_counter_ms = 0
    if not req.enabled and plug_hardware.relay_state == 'TRIPPED':
        plug_hardware.set_relay('RESET')
        plug_hardware.set_relay('ON')
    return {'success': True, 'protection_enabled': req.enabled}


class ApplianceRequest(BaseModel):
    appliance: str
    target_temp: Optional[int] = 22
    speed: Optional[int] = 2
    power_level_pct: Optional[int] = 100
    load_state: Optional[str] = "gaming"


class FaultRequest(BaseModel):
    fault_mode: Optional[Literal['compressor_leak', 'locked_rotor', 'bearing_wear']] = None


class ScenarioRequest(BaseModel):
    scenario: Literal['normal', 'peak_hours', 'hot_day', 'energy_saving']


@app.post('/api/scenario')
async def set_scenario(req: ScenarioRequest):
    plug_hardware.scenario = req.scenario
    return {'success': True, 'scenario': req.scenario}


class LoadRequest(BaseModel):
    appliance: str
    selected: bool = True
    quantity: Optional[int] = Field(default=None, ge=0, le=99)
    quantity_delta: Optional[Literal[-1, 1]] = None
    enabled: Optional[bool] = None
    load_pct: Optional[int] = Field(default=None, ge=10, le=150)
    target_temp: Optional[int] = Field(default=None, ge=16, le=30)
    speed: Optional[int] = Field(default=None, ge=1, le=3)
    oscillating: Optional[bool] = None
    mode: Optional[Literal['cook', 'warm']] = None
    power_level_pct: Optional[int] = Field(default=None, ge=10, le=100)
    load_state: Optional[Literal['idle', 'gaming']] = None


@app.post('/api/loads')
async def configure_load(req: LoadRequest):
    settings = req.model_dump(exclude_none=True, exclude={'appliance', 'selected'})
    try:
        plug_hardware.configure_load(req.appliance, req.selected, **settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {'success': True}


class GridRequest(BaseModel):
    disturbance: Optional[Literal['brownout', 'surge']] = None


# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


ws_manager = ConnectionManager()


# Background broadcast loop (every 500ms for smooth live oscilloscope & meters)
@app.on_event("startup")
async def start_telemetry_loop():
    async def loop():
        while True:
            try:
                frame = plug_hardware.get_live_oscilloscope()
                # Publish to MQTT
                mqtt_engine.publish_telemetry(frame["telemetry"])
                # Broadcast to connected web browsers
                payload = json.dumps(frame)
                await ws_manager.broadcast(payload)
            except Exception as e:
                print(f"[Telemetry Loop Error] {e}")
            await asyncio.sleep(0.5)

    asyncio.create_task(loop())


# ---------------- REST ENDPOINTS ---------------- #

@app.get("/api/telemetry")
async def get_telemetry():
    """Returns the latest sensor reading snapshot."""
    return plug_hardware.read_sensors()


@app.get("/api/oscilloscope")
async def get_oscilloscope():
    """Returns instantaneous 60Hz AC v(t) and i(t) waveform points."""
    return plug_hardware.get_live_oscilloscope()


@app.post("/api/relay")
async def set_relay(req: RelayRequest):
    """Actuates the physical relay switch (ON, OFF, or RESET if tripped)."""
    result = plug_hardware.set_relay(req.state)
    return result


@app.post("/api/appliance")
async def change_appliance(req: ApplianceRequest):
    """Swaps the appliance plugged into the socket."""
    success = plug_hardware.plug_appliance(
        req.appliance,
        target_temp=req.target_temp,
        speed=req.speed,
        power_level_pct=req.power_level_pct,
        load_state=req.load_state
    )
    if not success:
        raise HTTPException(status_code=400, detail=f"Unknown appliance. Choose from: {list(APPLIANCE_CATALOG.keys())}")
    return {"status": "ok", "appliance": plug_hardware.appliance.name}


@app.post("/api/fault")
async def inject_fault(req: FaultRequest):
    """Injects or clears appliance defects."""
    plug_hardware.inject_appliance_fault(req.fault_mode)
    return {"status": "ok", "fault_mode": req.fault_mode}


@app.post("/api/grid")
async def inject_grid(req: GridRequest):
    """Simulates grid brownouts or surges."""
    plug_hardware.inject_grid_disturbance(req.disturbance)
    return {"status": "ok", "voltage_sag_multiplier": plug_hardware.grid.voltage_sag_multiplier}


@app.get("/api/appliances")
async def list_appliances():
    """Returns full catalog of simulated appliances."""
    return {
        "catalog": [
            {"id": "air_conditioner", "name": "Inverter Air Conditioner (1.5 HP)", "nominal_w": 850, "pf": 0.94},
            {"id": "refrigerator", "name": "Frost-Free Refrigerator (Inverter)", "nominal_w": 150, "pf": 0.88},
            {"id": "fan", "name": "Electric Stand Fan (3 Speeds)", "nominal_w": 60, "pf": 0.82},
            {"id": "washing_machine", "name": "Washing Machine (Front-Load)", "nominal_w": 520, "pf": 0.85},
            {"id": "rice_cooker", "name": "Electric Rice Cooker (1.8L)", "nominal_w": 700, "pf": 1.00},
            {"id": "microwave", "name": "Microwave Oven (800W Output)", "nominal_w": 1250, "pf": 0.91},
            {"id": "gaming_pc", "name": "Gaming PC & Monitor", "nominal_w": 320, "pf": 0.97},
            {"id": "vacuum", "name": "Vacuum Cleaner (Canister)", "nominal_w": 1400, "pf": 0.86},
        ]
    }


@app.get("/api/mqtt/packets")
async def get_mqtt_packets():
    """Returns recent MQTT packets published."""
    return {"packets": mqtt_engine.get_recent_packets()}


# ---------------- WEBSOCKET STREAM ---------------- #

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time streaming for oscilloscope canvas and digital gauges."""
    await ws_manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps(plug_hardware.get_live_oscilloscope()))
        while True:
            cmd_text = await websocket.receive_text()
            try:
                cmd = json.loads(cmd_text)
                if "relay" in cmd:
                    plug_hardware.set_relay(cmd["relay"])
                elif "appliance" in cmd:
                    plug_hardware.plug_appliance(cmd["appliance"])
                elif "fault" in cmd:
                    plug_hardware.inject_appliance_fault(cmd.get("fault"))
                await ws_manager.broadcast(json.dumps(plug_hardware.get_live_oscilloscope()))
            except Exception as e:
                print(f"[WS Command Error] {e}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ---------------- SERVE STATIC DIGITAL TWIN BENCH ---------------- #

WEB_DIR = os.path.join(os.path.dirname(__file__), "web")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(WEB_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()

app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

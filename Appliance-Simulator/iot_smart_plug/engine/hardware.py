"""
hardware.py - Virtual Smart Plug Hardware & Energy Meter IC Controller
Emulates an ESP32 microcontroller with a dedicated Energy Metering IC (e.g. BL0937 / ADE7758)
and physical safety mechanisms:
- Mechanical Relay contactor (OPEN, CLOSED, TRIPPED)
- Hardware Overcurrent Protection (OCP at 15.0A / 3,450W)
- PCB Shunt Temperature dissipation model (T_pcb increases with I^2*R)
- Voltage Brownout & Sag detection
- Non-Volatile EEPROM kWh energy accumulation counter
"""

import inspect
import math
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from .physics import ACWaveformGenerator
from .appliances import APPLIANCE_CATALOG, BaseApplianceProfile, InverterAirConditioner


class SmartPlugHardware:
    """
    Virtual Hardware representation of an IoT Smart Plug.
    """
    def __init__(self, device_id: str = "kuryen_plug_m01", device_name: str = "Living Room Smart Plug"):
        self.device_id = device_id
        self.device_name = device_name
        self.firmware_version = "KuryenPlug-OS v2.4.1 (ESP32-S3)"
        
        # Hardware Relay State: 'CLOSED' (ON), 'OPEN' (OFF), 'TRIPPED' (Safety Lockout)
        self.relay_state = "CLOSED"
        self.last_relay_toggle = time.time()
        
        # Energy Metering IC & Grid Physics
        self.grid = ACWaveformGenerator(nominal_v_rms=230.0, nominal_freq_hz=60.0)
        
        # Active Appliance Load plugged into socket
        self.active_load_key = "air_conditioner"
        self.appliance: BaseApplianceProfile = InverterAirConditioner(target_temp=22)
        
        self.loads = {"air_conditioner": self.appliance}
        self.load_settings = {"air_conditioner": {"enabled": True, "load_pct": 100, "target_temp": 22}}

        # Internal Registers & Memory
        self.accumulated_kwh = 115.420     # Non-volatile EEPROM kWh counter
        self.last_sample_time = time.time()
        self.boot_time = time.time()
        
        # Safety & Thermal Monitoring
        self.ambient_temp_c = 28.5        # Ambient temperature (C)
        self.pcb_temp_c = 31.0            # Internal PCB shunt temperature
        self.ocp_trip_amps = 15.0         # 15A continuous current breaker trip
        self.trip_reason: Optional[str] = None
        self.ocp_counter_ms = 0
        self.protection_enabled = False
        self.scenario = 'normal'
        self.grid_disturbance = None
        self.selected_fault = None
        
        # Networking / WiFi
        self.wifi_ssid = "Meralco-Substation-IoT"
        self.wifi_rssi_dbm = -58

    def plug_appliance(self, appliance_key: str, **kwargs) -> bool:
        """Physically swaps the appliance plugged into the smart plug socket."""
        if appliance_key not in APPLIANCE_CATALOG:
            return False
        
        cls = APPLIANCE_CATALOG[appliance_key]
        self.active_load_key = appliance_key
        allowed = inspect.signature(cls).parameters
        settings = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        self.appliance = cls(**settings)
        self.loads = {appliance_key: self.appliance}
        self.load_settings = {appliance_key: {"enabled": True, "load_pct": 100, **settings}}
        self.appliance.on_power_on()
        return True

    def configure_load(self, key, selected=True, **settings):
        if key not in APPLIANCE_CATALOG:
            raise ValueError("Unknown appliance")
        delta = settings.pop('quantity_delta', None)
        if delta is not None:
            current = self.load_settings.get(key, {}).get('quantity', 1 if key in self.loads else 0)
            settings['quantity'] = current + delta
        quantity = settings.get('quantity', 1)
        if not isinstance(quantity, int) or isinstance(quantity, bool) or not 0 <= quantity <= 99:
            raise ValueError('Quantity must be between 0 and 99')
        if quantity == 0:
            selected = False
        if not selected:
            self.loads.pop(key, None)
            self.load_settings.pop(key, None)
            return
        if key not in self.loads:
            self.loads[key] = APPLIANCE_CATALOG[key]()
            self.load_settings[key] = {"enabled": True, "load_pct": 100}
        profile = self.loads[key]
        previous = self.load_settings[key]
        if settings.get("enabled") is True and not previous["enabled"]:
            profile.on_power_on()
        for field, value in settings.items():
            if field not in ("enabled", "load_pct", "quantity"):
                if not hasattr(profile, field):
                    raise ValueError(f"Setting {field} is not supported for {key}")
        for field, value in settings.items():
            if field not in ("enabled", "load_pct", "quantity"):
                setattr(profile, field, value)
        previous.update(settings)

    def load_configuration(self, key):
        profile = self.loads[key]
        return {"quantity": 1, **{k: getattr(profile, k) for k in
                   ("target_temp", "speed", "oscillating", "mode", "power_level_pct", "load_state")
                   if hasattr(profile, k)}, **self.load_settings[key]}

    def set_relay(self, desired_state: str) -> Dict[str, Any]:
        """Actuates the mechanical relay switch."""
        desired_state = desired_state.upper()
        
        if self.relay_state == "TRIPPED" and desired_state != "RESET":
            return {
                "success": False,
                "relay_state": "TRIPPED",
                "message": f"Cannot close relay: Safety Lockout active ({self.trip_reason}). Send RESET command first."
            }

        if desired_state in ["CLOSED", "ON"]:
            self.relay_state = "CLOSED"
            self.trip_reason = None
            self.last_relay_toggle = time.time()
            for key, profile in self.loads.items():
                if self.load_settings[key]["enabled"]:
                    profile.on_power_on()
        elif desired_state in ["OPEN", "OFF"]:
            self.relay_state = "OPEN"
            self.last_relay_toggle = time.time()
        elif desired_state == "RESET":
            self.relay_state = "OPEN"
            self.trip_reason = None
            self.ocp_counter_ms = 0

        return {"success": True, "relay_state": self.relay_state}

    def inject_grid_disturbance(self, disturbance_type: Optional[str]):
        """Injects real-world electrical grid disturbances."""
        self.grid_disturbance = disturbance_type
        if disturbance_type == "brownout":
            self.grid.voltage_sag_multiplier = 0.82  # Drop from 230V to ~188V
        elif disturbance_type == "surge":
            self.grid.voltage_sag_multiplier = 1.15  # Surge to ~265V
        else:
            self.grid.voltage_sag_multiplier = 1.0   # Normal 230V

    def inject_appliance_fault(self, fault_mode: Optional[str]):
        """Injects electrical/mechanical defects into the connected appliance."""
        self.selected_fault = fault_mode
        for profile in self.loads.values():
            profile.fault_mode = fault_mode

    def read_sensors(self) -> Dict[str, Any]:
        """
        Executes an instant metering sampling cycle.
        Returns full telemetry packet matching standard IoT formats.
        """
        now = time.time()
        dt_sec = max(0.001, now - self.last_sample_time)
        self.last_sample_time = now

        rows = []
        total_p, total_q = 0.0, 0.0
        for key, profile in self.loads.items():
            supported_faults = {'air_conditioner': ('compressor_leak', 'locked_rotor'),
                                'fan': ('bearing_wear',)}
            profile.fault_mode = self.selected_fault if self.selected_fault in supported_faults.get(key, ()) else None
            settings = self.load_configuration(key)
            p, pf, inductive = (0.0, 1.0, True)
            if self.relay_state == "CLOSED" and settings["enabled"]:
                p, pf, inductive = profile.step(now - profile.start_timestamp)
                # Explicit demo assumptions, not calibrated weather/efficiency models.
                if self.scenario == 'hot_day' and key in ('air_conditioner', 'refrigerator'):
                    p *= 1.2
                elif self.scenario == 'energy_saving' and key in ('air_conditioner', 'fan', 'gaming_pc'):
                    p *= 0.8
                p = round(max(0.0, p * settings["load_pct"] / 100), 2)
            unit_power = p
            p = round(unit_power * settings['quantity'], 2)
            q = p * math.tan(math.acos(max(0.05, min(1.0, pf)))) * (1 if inductive else -1)
            total_p += p
            total_q += q
            rows.append({"id": key, "name": profile.name, "settings": settings,
                         "unit_power_w": unit_power, "active_power_w": p})
        target_p = round(total_p, 2)
        apparent = math.hypot(target_p, total_q)
        target_pf = target_p / apparent if apparent else 1.0
        is_inductive = total_q >= 0

        # Physics calculation (V, I, P, Q, S, PF, THD)
        metrics = self.grid.sample_metrics(
            target_active_w=target_p,
            power_factor=target_pf,
            is_inductive=is_inductive,
            harmonic_thd=0.035 if target_p > 50.0 else 0.015
        )

        # Use the same samples for individual readings and the aggregate.
        metrics.update(p_active_w=target_p, q_reactive_var=round(total_q, 2),
                       s_apparent_va=round(apparent, 2),
                       i_rms=round(apparent / metrics["v_rms"], 3))

        # Accumulate real energy in kWh
        delta_kwh = (metrics["p_active_w"] * (dt_sec / 3600.0)) / 1000.0
        self.accumulated_kwh += delta_kwh

        # Thermal dissipation model: Shunt resistor heating (dT/dt = k * I^2 - cooling)
        i_current = metrics["i_rms"]
        joule_heat = (i_current ** 2) * 0.08
        cooling = (self.pcb_temp_c - self.ambient_temp_c) * 0.05
        self.pcb_temp_c += (joule_heat - cooling) * dt_sec
        self.pcb_temp_c = max(self.ambient_temp_c, min(95.0, round(self.pcb_temp_c, 1)))

        # Safety: Overcurrent Protection (OCP) Watchdog
        if self.protection_enabled and i_current > self.ocp_trip_amps:
            self.ocp_counter_ms += int(dt_sec * 1000)
            if self.ocp_counter_ms > 400:  # 400ms sustained overcurrent trip
                self.relay_state = "TRIPPED"
                self.trip_reason = f"OVERCURRENT_TRIP ({i_current:.1f}A exceeded {self.ocp_trip_amps}A limit)"
        else:
            self.ocp_counter_ms = max(0, self.ocp_counter_ms - int(dt_sec * 1000))

        # Safety: Overtemperature cutoff
        if self.protection_enabled and self.pcb_temp_c >= 85.0:
            self.relay_state = "TRIPPED"
            self.trip_reason = f"OVERHEAT_TRIP (PCB temperature hit {self.pcb_temp_c}C)"

        if self.relay_state != "CLOSED":
            for row in rows:
                row["active_power_w"] = 0.0
                row["unit_power_w"] = 0.0
            metrics.update(p_active_w=0.0, q_reactive_var=0.0, s_apparent_va=0.0, i_rms=0.0)

        # Brownout warning flag
        is_brownout = metrics["v_rms"] < 198.0

        return {
            "device": {
                "id": self.device_id,
                "name": self.device_name,
                "firmware": self.firmware_version,
                "uptime_sec": int(now - self.boot_time),
                "wifi_rssi_dbm": self.wifi_rssi_dbm + random.randint(-1, 1),
                "pcb_temperature_c": self.pcb_temp_c
            },
            "status": {
                "relay": self.relay_state,
                "connected_load": f"{sum(self.load_configuration(k)['quantity'] for k in self.loads)} appliances selected",
                "load_category": "Safety testing (15 A)" if self.protection_enabled else "Continuous monitoring",
                "protection_enabled": self.protection_enabled,
                "scenario": self.scenario,
                "grid_demand": 'high' if self.scenario == 'peak_hours' else 'normal',
                "grid_disturbance": self.grid_disturbance,
                "selected_fault": self.selected_fault,
                "fault_affected_appliances": [k for k, p in self.loads.items() if p.fault_mode],
                "trip_reason": self.trip_reason,
                "is_brownout": is_brownout,
                "fault_active": any(p.fault_mode is not None for p in self.loads.values()),
                "fault_code": next((p.fault_mode for p in self.loads.values() if p.fault_mode), None)
            },
            "electrical": {
                "voltage_v": metrics["v_rms"],
                "current_a": metrics["i_rms"],
                "active_power_w": metrics["p_active_w"],
                "reactive_power_var": metrics["q_reactive_var"],
                "apparent_power_va": metrics["s_apparent_va"],
                "power_factor": metrics["power_factor"],
                "phase_angle_deg": metrics["phase_angle_deg"],
                "frequency_hz": metrics["frequency_hz"],
                "thd_pct": metrics["thd_pct"]
            },
            "appliances": rows,
            "energy": {
                "total_kwh": round(self.accumulated_kwh, 4)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def get_live_oscilloscope(self) -> Dict[str, Any]:
        """Generates real-time 60Hz oscilloscope trace data for web visualization."""
        t_snapshot = self.read_sensors()
        v = t_snapshot["electrical"]["voltage_v"]
        i = t_snapshot["electrical"]["current_a"]
        phi = t_snapshot["electrical"]["phase_angle_deg"]
        f = t_snapshot["electrical"]["frequency_hz"]
        
        waveforms = self.grid.generate_oscilloscope_points(
            v_rms=v,
            i_rms=i,
            phase_angle_deg=phi,
            freq_hz=f,
            num_cycles=2.0,
            points=120
        )
        return {
            "telemetry": t_snapshot,
            "oscilloscope": waveforms
        }

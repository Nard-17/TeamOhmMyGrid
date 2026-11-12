"""
appliances.py - Realistic Household Electrical Appliance Models
Simulates true dynamic power consumption profiles, motor inrush surges,
thermostatic compressor modulation, and operational state machines.
"""

import math
import random
import time
from typing import Dict, Any, Optional


class BaseApplianceProfile:
    def __init__(self, name: str, category: str, nominal_w: float, power_factor: float, is_inductive: bool):
        self.name = name
        self.category = category
        self.nominal_w = nominal_w
        self.power_factor = power_factor
        self.is_inductive = is_inductive
        self.start_timestamp = time.time()
        self.inrush_multiplier = 1.0
        self.inrush_decay_sec = 0.3
        self.fault_mode: Optional[str] = None

    def on_power_on(self):
        self.start_timestamp = time.time()

    def get_inrush_transient(self, elapsed: float) -> float:
        """Models exponential inrush current decay: P_inrush = P_nominal * (M - 1) * e^(-t/tau)"""
        if elapsed < self.inrush_decay_sec * 3.0 and self.inrush_multiplier > 1.0:
            surge = self.nominal_w * (self.inrush_multiplier - 1.0)
            return max(0.0, surge * math.exp(-elapsed / self.inrush_decay_sec))
        return 0.0

    def step(self, elapsed_sec: float) -> Tuple[float, float, bool]:
        """
        Returns:
            (active_power_watts, power_factor, is_inductive)
        """
        raise NotImplementedError


# 1. Inverter Air Conditioner (1.5 HP)
class InverterAirConditioner(BaseApplianceProfile):
    def __init__(self, target_temp: int = 22):
        super().__init__("Air Conditioner (1.5 HP Inverter)", "HVAC", nominal_w=850.0, power_factor=0.94, is_inductive=True)
        self.target_temp = target_temp
        self.simulated_room_temp = 31.0   # starts warm (Philippine summer ambient)
        self.inrush_multiplier = 3.5      # soft-start inverter inrush
        self.inrush_decay_sec = 0.45

    def set_temperature(self, temp: int):
        self.target_temp = max(16, min(30, temp))

    def step(self, elapsed_sec: float):
        # Thermal equilibrium simulation: room gradually cools towards target
        cooling_progress = min(1.0, elapsed_sec / 90.0)  # 90s demo cooldown cycle
        self.simulated_room_temp = 31.0 - (cooling_progress * (31.0 - self.target_temp))
        
        # When room is warm, inverter runs at max capacity (~1250W); ramps down to ~420W once cooled
        temp_gap = max(0.0, self.simulated_room_temp - self.target_temp)
        modulated_power = 420.0 + (temp_gap * 115.0)

        # Compressor modulation oscillation
        modulation_wave = 35.0 * math.sin(elapsed_sec * 0.12)
        noise = random.gauss(0, 3.0)

        base_w = modulated_power + modulation_wave + noise
        if self.fault_mode == "compressor_leak":
            base_w = 1380.0 + random.gauss(0, 15.0)  # compressor maxed out without cooling
        elif self.fault_mode == "locked_rotor":
            base_w = 2650.0  # locked rotor surge

        inrush = self.get_inrush_transient(elapsed_sec)
        return (max(0.0, base_w + inrush), self.power_factor, self.is_inductive)


# 2. Frost-Free Two-Door Refrigerator
class FrostFreeRefrigerator(BaseApplianceProfile):
    def __init__(self):
        super().__init__("Refrigerator (Two-Door Inverter)", "Refrigeration", nominal_w=150.0, power_factor=0.88, is_inductive=True)
        self.inrush_multiplier = 4.8  # reciprocating compressor startup surge
        self.inrush_decay_sec = 0.25

    def step(self, elapsed_sec: float):
        # Realistic 3-phase cycle (compressed for demo: 70s period)
        cycle_time = elapsed_sec % 70.0
        
        if self.fault_mode == "door_left_open":
            # Compressor runs 100% duty cycle
            active_w = 175.0 + random.gauss(0, 3.5)
            pf = 0.88
        elif cycle_time < 40.0:
            # Compressor chilling phase (~145W)
            active_w = 145.0 + (10.0 * math.sin(elapsed_sec * 0.2)) + random.gauss(0, 1.8)
            pf = 0.89
        elif cycle_time < 50.0:
            # Defrost cycle: electric resistance heater turns on (260W, unity PF)
            active_w = 260.0 + random.gauss(0, 1.0)
            pf = 0.99
        else:
            # Idle standby (control board & sensors)
            active_w = 11.0 + random.gauss(0, 0.4)
            pf = 0.65  # low PF during low-power standby

        inrush = self.get_inrush_transient(cycle_time)
        return (max(0.0, active_w + inrush), pf, True)


# 3. Electric Stand Fan (3 Speeds)
class ElectricStandFan(BaseApplianceProfile):
    def __init__(self, speed: int = 2, oscillating: bool = True):
        super().__init__("Electric Stand Fan (16-inch)", "Small Motor", nominal_w=60.0, power_factor=0.82, is_inductive=True)
        self.speed = speed
        self.oscillating = oscillating
        self.phase = 0.0
        self.inrush_multiplier = 2.2
        self.inrush_decay_sec = 0.2

    def set_speed(self, speed: int):
        self.speed = max(1, min(3, speed))

    def step(self, elapsed_sec: float):
        # Speed 1: 42W, Speed 2: 58W, Speed 3: 75W
        speeds_w = {1: 42.0, 2: 58.0, 3: 75.0}
        base = speeds_w.get(self.speed, 58.0)

        # Motor rotational slip ripple (4 Hz)
        self.phase += 0.3
        ripple = 4.5 * math.sin(self.phase)

        # Oscillation gearbox drag (adds periodic 6W every 8 seconds)
        osc_drag = (5.5 * math.sin(elapsed_sec * 0.8)) if self.oscillating else 0.0

        if self.fault_mode == "bearing_wear":
            base *= 1.45
            ripple *= 3.0

        inrush = self.get_inrush_transient(elapsed_sec)
        return (max(0.0, base + ripple + osc_drag + inrush), self.power_factor, True)


# 4. Washing Machine (Full Cycle Program)
class WashingMachine(BaseApplianceProfile):
    def __init__(self):
        super().__init__("Washing Machine (Front-Load)", "Motor / High-Jitter", nominal_w=520.0, power_factor=0.85, is_inductive=True)
        self.inrush_multiplier = 3.0
        self.inrush_decay_sec = 0.35

    def step(self, elapsed_sec: float):
        # 45s demo cycle
        cycle = elapsed_sec % 45.0
        if cycle < 8.0:
            # Water valve filling
            base = 25.0 + random.gauss(0, 1.0)
            pf = 0.75
        elif cycle < 28.0:
            # Alternating agitation pulses (drum reverses direction every 3s)
            agitation = math.sin(elapsed_sec * 2.2)
            base = 180.0 + (280.0 * max(0.0, agitation)) + random.gauss(0, 12.0)
            pf = 0.82
        elif cycle < 34.0:
            # Drain pump active
            base = 55.0 + random.gauss(0, 2.0)
            pf = 0.80
        else:
            # Centrifugal spin cycle (high RPM)
            base = 540.0 + random.gauss(0, 28.0)
            pf = 0.89

        inrush = self.get_inrush_transient(cycle)
        return (max(0.0, base + inrush), pf, True)


# 5. Electric Rice Cooker (Automatic Keep-Warm)
class ElectricRiceCooker(BaseApplianceProfile):
    def __init__(self, mode: str = "cook"):
        super().__init__("Rice Cooker (1.8L)", "Resistive Thermal", nominal_w=700.0, power_factor=1.0, is_inductive=False)
        self.mode = mode

    def step(self, elapsed_sec: float):
        if self.mode == "cook":
            # Steady heating element: pure resistive
            base = 700.0 + random.gauss(0, 2.0)
        else:
            # Keep warm: bi-metallic thermostat pulses 45W for 6s every 20s
            is_heating = (elapsed_sec % 20.0) < 6.0
            base = 45.0 + random.gauss(0, 0.8) if is_heating else 4.0

        return (max(0.0, base), 1.0, False)


# 6. Microwave Oven
class MicrowaveOven(BaseApplianceProfile):
    def __init__(self, power_level_pct: int = 100):
        super().__init__("Microwave Oven (800W Output)", "Transformer / Magnetron", nominal_w=1250.0, power_factor=0.91, is_inductive=True)
        self.power_level_pct = power_level_pct
        self.inrush_multiplier = 4.2  # High inrush from high-voltage transformer
        self.inrush_decay_sec = 0.15

    def step(self, elapsed_sec: float):
        # Duty cycle modulation: 10s period
        cycle = elapsed_sec % 10.0
        on_duration = 10.0 * (self.power_level_pct / 100.0)
        
        if cycle < on_duration:
            # Magnetron + cooling fan active
            base = 1250.0 + random.gauss(0, 8.0)
        else:
            # Turntable motor and cooling fan only
            base = 40.0 + random.gauss(0, 1.0)

        inrush = self.get_inrush_transient(cycle)
        return (max(0.0, base + inrush), self.power_factor, True)


# 7. Desktop Gaming PC & Entertainment
class GamingDesktopPC(BaseApplianceProfile):
    def __init__(self, load_state: str = "gaming"):
        super().__init__("Gaming PC & Monitor", "Switch-Mode PSU", nominal_w=320.0, power_factor=0.97, is_inductive=False)
        self.load_state = load_state  # "idle" or "gaming"
        self.inrush_multiplier = 3.8  # Bulk capacitor charging inrush
        self.inrush_decay_sec = 0.1

    def step(self, elapsed_sec: float):
        if self.load_state == "idle":
            base = 65.0 + (10.0 * math.sin(elapsed_sec * 0.4)) + random.gauss(0, 2.0)
        else:
            # GPU/CPU dynamic power fluctuation
            fluctuation = 45.0 * math.sin(elapsed_sec * 1.5) + (25.0 * math.cos(elapsed_sec * 3.1))
            base = 320.0 + fluctuation + random.gauss(0, 6.0)

        inrush = self.get_inrush_transient(elapsed_sec)
        # Switching PSU with active PFC: slight capacitive leading phase
        return (max(0.0, base + inrush), self.power_factor, False)


# 8. Vacuum Cleaner (High Power Universal Motor)
class VacuumCleaner(BaseApplianceProfile):
    def __init__(self):
        super().__init__("Vacuum Cleaner (Canister)", "High-Power Motor", nominal_w=1400.0, power_factor=0.86, is_inductive=True)
        self.inrush_multiplier = 3.6
        self.inrush_decay_sec = 0.3

    def step(self, elapsed_sec: float):
        base = 1400.0 + (30.0 * math.sin(elapsed_sec * 0.9)) + random.gauss(0, 15.0)
        inrush = self.get_inrush_transient(elapsed_sec)
        return (max(0.0, base + inrush), self.power_factor, True)


APPLIANCE_CATALOG = {
    "air_conditioner": InverterAirConditioner,
    "refrigerator": FrostFreeRefrigerator,
    "fan": ElectricStandFan,
    "washing_machine": WashingMachine,
    "rice_cooker": ElectricRiceCooker,
    "microwave": MicrowaveOven,
    "gaming_pc": GamingDesktopPC,
    "vacuum": VacuumCleaner,
}

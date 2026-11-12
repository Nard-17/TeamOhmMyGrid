"""
physics.py - High-Fidelity AC Electrical Grid & Waveform Physics Engine
Models real 230V RMS, 60Hz AC electrical dynamics:
- Instantaneous Voltage v(t) & Current i(t) waveforms
- Phase Shift angle (phi), Active Power (P), Reactive Power (Q), Apparent Power (S)
- Power Factor (PF = cos phi)
- Motor/Compressor Inrush Current transients (e^-t/tau)
- Harmonic distortion & Grid disturbances (Voltage sags, frequency jitter)
"""

import math
import random
import time
from typing import Dict, Any, List, Tuple


class ACWaveformGenerator:
    """
    Simulates high-precision AC electrical dynamics for 230V / 60Hz mains.
    """
    def __init__(self, nominal_v_rms: float = 230.0, nominal_freq_hz: float = 60.0):
        self.nominal_v_rms = nominal_v_rms
        self.nominal_freq_hz = nominal_freq_hz
        self.voltage_sag_multiplier = 1.0   # 1.0 = normal, 0.82 = brownout
        self.harmonic_noise_level = 0.02

    def sample_metrics(
        self,
        target_active_w: float,
        power_factor: float = 0.95,
        is_inductive: bool = True,
        inrush_active_w: float = 0.0,
        harmonic_thd: float = 0.03
    ) -> Dict[str, Any]:
        """
        Calculates instantaneous physical metering quantities.
        P = V_rms * I_rms * cos(phi)
        Q = V_rms * I_rms * sin(phi)
        S = V_rms * I_rms = sqrt(P^2 + Q^2)
        """
        # Subtle real-world grid fluctuations (+/- 0.8V, +/- 0.03Hz)
        v_rms = (self.nominal_v_rms * self.voltage_sag_multiplier) + random.gauss(0, 0.4)
        v_rms = max(10.0, round(v_rms, 2))
        
        freq_hz = round(self.nominal_freq_hz + random.gauss(0, 0.015), 3)
        
        # Effective active power including any active inrush transient
        p_active = max(0.0, target_active_w + inrush_active_w + random.gauss(0, 0.8))
        
        # Clamp power factor between 0.1 and 1.0
        pf = max(0.05, min(1.0, power_factor))
        phi_rad = math.acos(pf)
        if not is_inductive:
            phi_rad = -phi_rad
        phi_deg = round(math.degrees(phi_rad), 2)

        # Apparent power S (VA) and Reactive power Q (VAR)
        if p_active > 0.1 and v_rms > 10.0:
            s_apparent = p_active / pf
            q_reactive = s_apparent * math.sin(phi_rad)
            i_rms = s_apparent / v_rms
        else:
            p_active = 0.0
            s_apparent = 0.0
            q_reactive = 0.0
            i_rms = 0.0

        return {
            "v_rms": round(v_rms, 2),
            "i_rms": round(i_rms, 3),
            "p_active_w": round(p_active, 2),
            "q_reactive_var": round(q_reactive, 2),
            "s_apparent_va": round(s_apparent, 2),
            "power_factor": round(pf, 3),
            "phase_angle_deg": phi_deg,
            "frequency_hz": freq_hz,
            "thd_pct": round(harmonic_thd * 100, 2)
        }

    def generate_oscilloscope_points(
        self,
        v_rms: float,
        i_rms: float,
        phase_angle_deg: float,
        freq_hz: float,
        num_cycles: float = 2.0,
        points: int = 120
    ) -> Dict[str, List[float]]:
        """
        Generates instantaneous v(t) and i(t) coordinates over 2 full AC cycles (33.3ms)
        for real-time oscilloscope display on the web bench.
        v(t) = sqrt(2) * V_rms * sin(2*pi*f*t)
        i(t) = sqrt(2) * I_rms * sin(2*pi*f*t - phi) + harmonics
        """
        omega = 2.0 * math.pi * freq_hz
        total_time = num_cycles / freq_hz
        dt = total_time / points
        phi_rad = math.radians(phase_angle_deg)

        v_peak = math.sqrt(2) * v_rms
        i_peak = math.sqrt(2) * i_rms

        v_series = []
        i_series = []
        t_series = []

        for step in range(points):
            t = step * dt
            # Base 60Hz sine waves
            v_val = v_peak * math.sin(omega * t)
            # Add subtle 3rd harmonic to voltage (mains distortion)
            v_val += (v_peak * 0.015) * math.sin(3 * omega * t)

            # Current wave with lagging/leading phase shift
            i_val = i_peak * math.sin(omega * t - phi_rad)
            # Add 3rd harmonic (non-linear appliance signature)
            if i_peak > 0.1:
                i_val += (i_peak * 0.04) * math.sin(3 * (omega * t - phi_rad))

            t_series.append(round(t * 1000, 2))  # milliseconds
            v_series.append(round(v_val, 2))
            i_series.append(round(i_val, 3))

        return {
            "time_ms": t_series,
            "voltage": v_series,
            "current": i_series
        }

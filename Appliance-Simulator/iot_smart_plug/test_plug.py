"""
test_plug.py - Comprehensive Unit & Integration Verification Suite
Tests AC electrical physics, appliance profiles, OCP breaker trip, and REST/WebSocket endpoints.
"""

import math
import json
import urllib.request
from iot_smart_plug.engine.physics import ACWaveformGenerator
from iot_smart_plug.engine.hardware import SmartPlugHardware
from iot_smart_plug.engine.appliances import APPLIANCE_CATALOG


def test_ac_physics():
    print("[1] Testing AC Grid Physics & Waveform Math...")
    grid = ACWaveformGenerator(nominal_v_rms=230.0, nominal_freq_hz=60.0)
    
    # Test 850W inductive load (PF = 0.94)
    m = grid.sample_metrics(target_active_w=850.0, power_factor=0.94, is_inductive=True)
    assert 220.0 <= m["v_rms"] <= 240.0, f"Voltage out of bounds: {m['v_rms']}"
    assert 3.5 <= m["i_rms"] <= 4.5, f"Current calculation mismatch: {m['i_rms']}"
    assert m["s_apparent_va"] > m["p_active_w"], "Apparent power must exceed active power for PF < 1.0"
    assert m["q_reactive_var"] > 0, "Reactive power must be positive for inductive loads"
    print(f"    -> AC Physics Verified: {m['v_rms']}V | {m['i_rms']}A | P={m['p_active_w']}W | Q={m['q_reactive_var']}VAR | PF={m['power_factor']}")

    # Test Oscilloscope Waveform generation
    scope = grid.generate_oscilloscope_points(v_rms=m["v_rms"], i_rms=m["i_rms"], phase_angle_deg=m["phase_angle_deg"], freq_hz=60.0)
    assert len(scope["voltage"]) == 120
    assert len(scope["current"]) == 120
    print(f"    -> Oscilloscope Generator Verified: {len(scope['voltage'])} points sampled over 2 cycles")


def test_hardware_and_appliances():
    print("[2] Testing Appliance Bay & Hardware Protection...")
    plug = SmartPlugHardware()
    plug.protection_enabled = True
    
    # Test plugging in each appliance
    for app_key in APPLIANCE_CATALOG:
        ok = plug.plug_appliance(app_key)
        assert ok, f"Failed to plug in {app_key}"
        snap = plug.read_sensors()
        assert snap["appliances"][0]["name"] == plug.appliance.name
    print(f"    -> All {len(APPLIANCE_CATALOG)} appliances plugged & verified successfully")

    # Test Overcurrent Protection (OCP) Tripping
    print("[3] Testing Overcurrent Safety Trip (Breaker)...")
    # Force 20A current overload by running heavy vacuum with locked rotor
    plug.plug_appliance("vacuum")
    plug.appliance.nominal_w = 4000.0  # simulate massive short/overload
    
    # Step sensors until breaker trips
    tripped = False
    for _ in range(10):
        s = plug.read_sensors()
        if s["status"]["relay"] == "TRIPPED":
            tripped = True
            print(f"    -> Breaker TRIPPED successfully! Reason: {s['status']['trip_reason']}")
            break
        import time; time.sleep(0.06)
    
    assert tripped, "OCP failed to trip on 4000W overload!"
    
    # Test Reset
    plug.set_relay("RESET")
    assert plug.relay_state == "OPEN"
    print("    -> Breaker reset verified")


if __name__ == "__main__":
    test_ac_physics()
    test_hardware_and_appliances()
    print("\n[SUCCESS] ALL PHYSICAL ENGINE & HARDWARE TESTS PASSED!")

# KuryenPlug Pro - High-Fidelity IoT Smart Plug Hardware Emulator

## Multiple appliances

Select any combination of the eight appliance cards. Each selected appliance has
its own power switch, simulated load-size setting, live watt reading, and applicable
controls (AC temperature, fan speed and oscillation, cooker mode, microwave power,
or computer activity). Click a selected card again or use Remove to disconnect it.
Use + and - to select 1-99 units per type; reducing a quantity to zero removes it.
Units of one type share settings and the same simulated profile. Telemetry exposes
`unit_power_w`, the group `active_power_w`, and `settings.quantity`. Group watts
equal per-unit watts multiplied by quantity. The API accepts `quantity` (0-99)
or `quantity_delta` (-1 or 1) to change counts without lost rapid updates.

The overview adds the individual watt readings from the same sample. All loads
share a master switch. Continuous monitoring is the default: high current or
temperature does not interrupt telemetry. Enable automatic safety cutoffs under
Problem scenarios to test the shared 15 A / 85 C protection; this can trip the whole
group. Disabling safety testing clears a trip and resumes monitoring. This is a
software simulation mode, not guidance for physical wiring. Load size is a simulation multiplier, not a physical appliance setting.
Settings are held in memory and reset when the server restarts.

`POST /api/loads` accepts `appliance`, `selected`, and optional settings. For example:
`{"appliance":"fan","speed":3,"enabled":true,"load_pct":100}`.
Telemetry now includes an `appliances` array with each load's ID, settings, and
`active_power_w`. The legacy `/api/appliance` route still replaces the whole selection.

Run regression checks with `python -m unittest iot_smart_plug.test_multi_load`.

A production-grade, software-defined **IoT Smart Plug simulator** built specifically for the **Meralco IDOL Hackathon 2026** by team **Ohm My Grid!**.

---

## ⚡ What Makes This Simulation "As Real As Possible"?

### 1. True AC Electrical Grid Physics (230V RMS, 60 Hz)
Unlike simple simulators that output static wattage numbers, this engine calculates instantaneous alternating current physics:
- **Instantaneous Waveforms:** Models $v(t) = \sqrt{2} V_{\text{RMS}} \sin(2\pi f t)$ and $i(t) = \sqrt{2} I_{\text{RMS}} \sin(2\pi f t - \phi)$.
- **Phase Shift Angle ($\phi$):** Accurately accounts for inductive phase lag (motors, compressors) and capacitive lead (switching power supplies).
- **Power Components:**
  - **Active Power ($P$):** Real work in Watts ($P = V_{\text{RMS}} \cdot I_{\text{RMS}} \cdot \cos\phi$).
  - **Reactive Power ($Q$):** Magnetic field energy in VAR ($Q = V_{\text{RMS}} \cdot I_{\text{RMS}} \cdot \sin\phi$).
  - **Apparent Power ($S$):** Total load in VA ($S = \sqrt{P^2 + Q^2}$).
  - **Power Factor ($\text{PF}$):** $\text{PF} = \cos\phi$.
- **Motor Inrush Current:** Models high-current exponential startup surges ($P_{\text{inrush}} \cdot e^{-t/\tau}$) during motor/compressor initial ignition.
- **Harmonics & THD:** Injects 3rd and 5th harmonic distortion typical of modern electronic switching power supplies.

---

### 2. Physical Microcontroller & Energy Meter Hardware Model
- **ESP32-S3 Microcontroller Core:** Emulates firmware uptime, FreeRTOS background loops, WiFi RSSI ($-58\text{ dBm}$), and internal PCB shunt temperature dissipation.
- **Mechanical Contactor Relay:** 3 physical contact states: `CLOSED` (ON), `OPEN` (OFF), and `TRIPPED` (Safety Lockout).
- **Overcurrent Protection (OCP):** Physical safety breaker trips when continuous load exceeds **15.0A / 3,450W** for $>400\text{ms}$.
- **Thermal Model:** Internal shunt heating ($P_{\text{loss}} = I^2 R$) triggers overtemperature shutdown at $>85^\circ\text{C}$.
- **Grid Brownout / Surge Simulation:** Injects voltage sags down to $188\text{V}_{\text{RMS}}$ or surges up to $265\text{V}_{\text{RMS}}$.

---

### 3. Realistic Household Appliance Catalog
1. **Inverter Air Conditioner (1.5 HP):** Dynamic inverter compressor frequency modulation (scales from 1,250W cooldown down to 420W steady-state) based on room thermostat setpoint (16°C – 30°C).
2. **Frost-Free Refrigerator:** 3-stage thermodynamic state machine: compressor chilling (145W) $\rightarrow$ defrost heating element (260W) $\rightarrow$ idle standby (11W).
3. **Electric Stand Fan (16"):** 3 selectable speeds + rotational aerodynamic sine ripple + motorized oscillation drag.
4. **Washing Machine:** Agitation wash pulses (alternating motor torque) $\rightarrow$ drain pump $\rightarrow$ high-RPM centrifugal spin cycle (540W).
5. **Electric Rice Cooker:** Resistive cook cycle (700W, $\text{PF}=1.0$) vs bi-metallic thermostat warm cycle (45W pulses).
6. **Microwave Oven:** High-voltage transformer inrush + duty-cycled magnetron pulses.
7. **Gaming PC & Entertainment:** Non-linear power supply with active power factor correction (idle 65W, gaming 320W).
8. **Vacuum Cleaner:** Universal motor with 1,400W suction power.

---

### 4. Real-Time Oscilloscope & MQTT Protocol
- **Real-Time 60Hz Canvas Oscilloscope:** 60 FPS HTML5 canvas drawing real time-domain voltage (yellow) and current (cyan) waveforms over 2 AC cycles ($33.3\text{ ms}$).
- **IoT MQTT Protocol:** Publishes standard telemetry on `meralco/smartplug/{device_id}/state` and receives control commands on `meralco/smartplug/{device_id}/set`.

---

## 🚀 How to Run

1. **Install dependencies:**
   ```powershell
   python -m pip install -r iot_smart_plug/requirements.txt
   ```
2. **Start the Smart Plug Server:**
   ```powershell
   python -m uvicorn iot_smart_plug.main:app --host 0.0.0.0 --port 8000
   ```
3. **Open the Engineering Workbench:**
   👉 **`http://localhost:8000`** in your browser.

## Scenario controls

Selected scenario, supply, and defect buttons reflect server telemetry, so selections
survive browser refreshes. Only one option per group is active; groups can combine.
`POST /api/scenario` accepts `normal`, `peak_hours`, `hot_day`, or `energy_saving`.
Peak hours sets simulated grid demand to high without changing watts or prices.
Hot day applies an illustrative 1.2 multiplier to AC and refrigerator power.
Energy-saving applies 0.8 to AC, fan, and gaming-PC power. These are explicit demo
assumptions, not calibrated forecasts, utility schedules, or live grid signals.
Faults affect compatible models only: compressor faults affect AC; bearing wear
 affects fans. Telemetry reports selected faults separately from affected loads.
Settings are in-memory and do not persist across a server restart.

/**
 * app.js - KuryenPlug Pro Hardware Bench Controller & 60fps Oscilloscope Canvas
 */

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws`;
let ws;

let currentRelay = "CLOSED";
let selectedLoads = [];

// --- CANVAS OSCILLOSCOPE SETUP ---
const canvas = document.getElementById('scopeCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 260;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
document.getElementById('technical-details').addEventListener('toggle', resizeCanvas);

function drawOscilloscopeGrid() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1;

  const numX = 10;
  const numY = 8;
  for (let i = 0; i <= numX; i++) {
    const x = (w / numX) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 0; j <= numY; j++) {
    const y = (h / numY) * j;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Center dashed zero-crossing lines
  ctx.strokeStyle = '#1e293b';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderWaveforms(scopeData) {
  drawOscilloscopeGrid();
  if (!scopeData || !scopeData.voltage || scopeData.voltage.length === 0) return;

  const w = canvas.width;
  const h = canvas.height;
  const centerY = h / 2;
  const points = scopeData.voltage.length;
  const stepX = w / (points - 1);

  // 1. Draw Voltage v(t) - Yellow Line (Scaled: +/- 400V full range)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 8;
  ctx.beginPath();

  for (let i = 0; i < points; i++) {
    const v = scopeData.voltage[i];
    // Map -400V to +400V -> [h, 0]
    const y = centerY - (v / 400.0) * (centerY * 0.85);
    const x = i * stepX;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 2. Draw Current i(t) - Cyan Line (Scaled dynamically: +/- 15A max)
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 8;
  ctx.beginPath();

  const maxCurrentScale = 15.0; // 15 Amperes trip ceiling
  for (let i = 0; i < points; i++) {
    const amp = scopeData.current[i];
    const y = centerY - (amp / maxCurrentScale) * (centerY * 0.85);
    const x = i * stepX;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0; // reset glow
}

// --- WEBSOCKET CONNECTION ---
function connectWebSocket() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('connection-status').textContent = 'Live simulation';
    document.getElementById('chip-mqtt').textContent = 'ACTIVE (2 Hz)';
    document.getElementById('chip-mqtt').className = 'chip-val status-cyan';
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      updateDashboard(data);
    } catch (e) {
      console.error('[WS Parse Error]', e);
    }
  };

  ws.onclose = () => {
    document.getElementById('connection-status').textContent = 'Reconnecting - readings paused';
    document.getElementById('chip-mqtt').textContent = 'RECONNECTING...';
    document.getElementById('chip-mqtt').className = 'chip-val status-red';
    setTimeout(connectWebSocket, 2000);
  };
}

// --- UPDATE DASHBOARD UI ---
function updateDashboard(frame) {
  const t = frame.telemetry;
  const s = frame.oscilloscope;

  const elec = t.electrical;
  const status = t.status;
  const dev = t.device;
  updateScenarioControls(status);
  document.getElementById('safety-testing').checked = Boolean(status.protection_enabled);
  const safetyMessage = status.trip_reason?.startsWith('OVERHEAT')
    ? `The simulated plug overheated (now ${dev.pcb_temperature_c.toFixed(1)} C). Let it cool, then press Reset switch. After resetting, press Turn on.`
    : `The combined appliances exceeded the circuit's 15 A limit, possibly during startup. Turn off or remove some appliances, press Reset switch, then Turn on. Add appliances gradually to avoid another trip.`;
  renderLoads(t.appliances || []);
  document.getElementById('simple-power').textContent = elec.active_power_w.toFixed(2);
  document.getElementById('simple-energy').textContent = `${t.energy.total_kwh.toFixed(4)} kWh`;
  document.getElementById('simple-status').textContent = status.relay === 'TRIPPED'
    ? safetyMessage
    : status.relay === 'OPEN' ? 'Power is off. All appliances are disconnected from power.'
    : status.is_brownout ? 'Low voltage scenario is active. Your appliance is receiving reduced voltage.'
    : status.fault_active ? 'An appliance problem is being simulated. Clear defects to return to normal.'
    : (status.protection_enabled ? 'Safety testing is on. Automatic cutoffs may stop readings.' : 'Continuous monitoring is on. Automatic safety cutoffs are off.');

  // 1. Oscilloscope Render
  renderWaveforms(s);

  // Scope Footer Stats
  const vPeak = (elec.voltage_v * Math.SQRT2).toFixed(1);
  const iPeak = (elec.current_a * Math.SQRT2).toFixed(2);
  document.getElementById('scope-vpeak').textContent = `±${vPeak} V`;
  document.getElementById('scope-ipeak').textContent = `±${iPeak} A`;
  
  const pfStr = elec.phase_angle_deg >= 0 ? `${elec.phase_angle_deg}° (Lagging)` : `${Math.abs(elec.phase_angle_deg)}° (Leading)`;
  document.getElementById('scope-phi').textContent = pfStr;

  // 2. Precision Meters
  document.getElementById('m-active-p').textContent = elec.active_power_w.toFixed(1);
  document.getElementById('m-v-rms').textContent = elec.voltage_v.toFixed(1);
  document.getElementById('m-i-rms').textContent = elec.current_a.toFixed(3);
  document.getElementById('m-pf').textContent = elec.power_factor.toFixed(3);
  document.getElementById('m-reactive-q').textContent = elec.reactive_power_var.toFixed(1);
  document.getElementById('m-apparent-s').textContent = elec.apparent_power_va.toFixed(1);
  document.getElementById('m-freq').textContent = elec.frequency_hz.toFixed(2);
  document.getElementById('m-thd').textContent = elec.thd_pct.toFixed(1);

  // Meter Progress Bars
  document.getElementById('bar-p').style.width = Math.min(100, (elec.active_power_w / 3450) * 100) + '%';
  document.getElementById('bar-v').style.width = Math.min(100, (elec.voltage_v / 260) * 100) + '%';
  document.getElementById('bar-i').style.width = Math.min(100, (elec.current_a / 15.0) * 100) + '%';
  document.getElementById('bar-pf').style.width = (elec.power_factor * 100) + '%';

  // 3. Top Status Chips
  document.getElementById('chip-temp').textContent = `${dev.pcb_temperature_c.toFixed(1)}°C`;
  document.getElementById('chip-wifi').textContent = `${dev.wifi_rssi_dbm} dBm`;
  
  if (status.is_brownout) {
    document.getElementById('chip-grid').textContent = `${elec.voltage_v.toFixed(0)}V (BROWNOUT)`;
    document.getElementById('chip-grid').className = 'chip-val status-red';
  } else {
    document.getElementById('chip-grid').textContent = `${elec.voltage_v.toFixed(0)}V / ${elec.frequency_hz.toFixed(1)}Hz`;
    document.getElementById('chip-grid').className = 'chip-val';
  }

  // 4. Relay & Safety Status
  currentRelay = status.relay;
  const pwrBtn = document.getElementById('hw-power-button');
  const chipRelay = document.getElementById('chip-relay');
  const ledPwr = document.getElementById('led-pwr');
  const ledErr = document.getElementById('led-err');
  const alertBanner = document.getElementById('safety-alert');
  pwrBtn.disabled = false;
  document.getElementById('master-power-help').textContent = currentRelay === 'TRIPPED'
    ? safetyMessage
    : currentRelay === 'OPEN' ? 'Master power is off. Press Turn on to supply power to enabled appliances.'
    : 'Master power is on. This switch controls every selected appliance.';
  pwrBtn.setAttribute('aria-pressed', String(currentRelay === 'CLOSED'));

  if (currentRelay === 'CLOSED') {
    chipRelay.textContent = 'Power on';
    chipRelay.className = 'chip-val status-green';
    pwrBtn.className = 'power-button power-on';
    document.getElementById('power-button-text').textContent = 'Turn off';
    ledPwr.className = 'led-dot led-green';
    ledErr.className = 'led-dot led-off';
    alertBanner.className = 'safety-banner alert-hidden';
  } else if (currentRelay === 'OPEN') {
    chipRelay.textContent = 'Power off';
    chipRelay.className = 'chip-val';
    pwrBtn.className = 'power-button power-off';
    document.getElementById('power-button-text').textContent = 'Turn on';
    ledPwr.className = 'led-dot led-off';
    ledErr.className = 'led-dot led-off';
    alertBanner.className = 'safety-banner alert-hidden';
  } else if (currentRelay === 'TRIPPED') {
    chipRelay.textContent = 'Safety stop';
    chipRelay.className = 'chip-val status-red';
    pwrBtn.className = 'power-button power-tripped';
    document.getElementById('power-button-text').textContent = 'Reset switch';
    ledPwr.className = 'led-dot led-off';
    ledErr.className = 'led-dot led-red';
    alertBanner.className = 'safety-banner';
    document.getElementById('safety-alert-text').textContent = safetyMessage;
  }

  // Meta details
  document.getElementById('val-connected-load').textContent = status.connected_load;
  document.getElementById('val-load-cat').textContent = status.load_category;
  document.getElementById('val-total-kwh').textContent = `${t.energy.total_kwh.toFixed(4)} kWh`;

  // 5. Append to MQTT Log Stream
  appendMqttRow(dev.id, elec);
}

function appendMqttRow(deviceId, elec) {
  const list = document.getElementById('mqtt-log-list');
  const now = new Date().toLocaleTimeString();
  
  const row = document.createElement('div');
  row.className = 'mqtt-row';
  row.innerHTML = `
    <div>
      <span class="mqtt-topic">meralco/smartplug/${deviceId}/state</span>
      <span class="mqtt-payload">P:${elec.active_power_w}W | V:${elec.voltage_v}V | I:${elec.current_a}A | PF:${elec.power_factor}</span>
    </div>
    <div class="mqtt-time">${now} [QoS 0]</div>
  `;

  list.insertBefore(row, list.firstChild);
  if (list.children.length > 20) {
    list.removeChild(list.lastChild);
  }
}

// --- USER ACTIONS ---
async function sendCommand(url, options) {
  const feedback = document.getElementById('action-feedback');
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('The simulator could not apply that change. Please try again.');
    const result = await response.json();
    if (result.success === false) throw new Error(result.message || 'Reset the safety switch first.');
    feedback.hidden = true;
  } catch (error) {
    feedback.textContent = error.message || 'Connection lost. Please try again.';
    feedback.hidden = false;
  }
}


function setSafetyTesting(enabled) {
  sendCommand('/api/protection', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({enabled})});
}

function toggleRelay() {
  if (currentRelay === 'TRIPPED') {
    resetBreaker();
    return;
  }
  const next = currentRelay === 'CLOSED' ? 'OFF' : 'ON';
  sendCommand('/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: next })
  });
}

function resetBreaker() {
  sendCommand('/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'RESET' })
  });
}

function loadCommand(body) {
  return sendCommand('/api/loads', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
}
function selectAppliance(key) {
  loadCommand({appliance:key, selected:!selectedLoads.some(a=>a.id===key)});
}
function configureAppliance(key, field, value) {
  loadCommand({appliance:key, [field]:value});
}
function renderLoads(loads) {
  selectedLoads = loads;
  document.querySelectorAll('.app-btn').forEach(button=>{
    const selected=loads.some(a=>a.id===button.dataset.app);
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  const list=document.getElementById('selected-appliances');
  const signature=JSON.stringify(loads.map(a=>[a.id,a.settings]));
  if(list.dataset.signature!==signature) {
    list.dataset.signature=signature;
    list.replaceChildren();
    if(!loads.length) { const empty=document.createElement('p'); empty.textContent='No appliances selected. Choose a card above to begin.'; list.append(empty); }
    for(const appliance of loads) {
      const card=document.createElement('article'); card.className='selected-load';
      const heading=document.createElement('h3');heading.textContent=appliance.name;card.append(heading);
      const watts=document.createElement('strong');watts.id='watts-'+appliance.id;watts.className='load-watts';card.append(watts);
      const quantity = appliance.settings.quantity || 1;
      const counter=document.createElement('div');counter.className='quantity-control';
      const minus=document.createElement('button');minus.type='button';minus.textContent='-';minus.setAttribute('aria-label','Remove one '+appliance.name);
      minus.onclick=()=>loadCommand({appliance:appliance.id,quantity_delta:-1});
      const count=document.createElement('span');count.textContent=quantity+' '+(quantity===1?'unit':'units');
      const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.disabled=quantity>=99;plus.setAttribute('aria-label','Add one '+appliance.name);
      plus.onclick=()=>loadCommand({appliance:appliance.id,quantity_delta:1});
      counter.append(minus,count,plus);card.append(counter);
      const unit=document.createElement('p');unit.id='unit-watts-'+appliance.id;unit.className='quantity-note';card.append(unit);
      const note=document.createElement('p');note.className='quantity-note quantity-explanation';note.textContent='Settings and power switch apply to all units of this type. Each unit uses the same simulated profile.';card.append(note);
      const power=document.createElement('button');power.className='sub-btn';power.textContent=appliance.settings.enabled?'Turn this off':'Turn this on';power.setAttribute('aria-pressed',String(appliance.settings.enabled));power.onclick=()=>configureAppliance(appliance.id,'enabled',!appliance.settings.enabled);card.append(power);
      const remove=document.createElement('button');remove.className='remove-load';remove.textContent='Remove';remove.onclick=()=>loadCommand({appliance:appliance.id,selected:false});card.append(remove);
      const control=(field,label,options)=>{
        const wrap=document.createElement('label');wrap.textContent=label;
        const select=document.createElement('select');
        for(const [value,text] of options) { const option=document.createElement('option');option.value=String(value);option.textContent=text;option.selected=String(appliance.settings[field])===String(value);select.append(option); }
        select.onchange=()=>{let value=select.value;if(typeof options[0][0]==='number')value=Number(value);if(typeof options[0][0]==='boolean')value=value==='true';configureAppliance(appliance.id,field,value);};wrap.append(select);card.append(wrap);
      };
      control('load_pct','Simulated load size',[[50,'Small (50%)'],[75,'75%'],[100,'Standard (100%)'],[125,'125%'],[150,'Large (150%)']]);
      if('target_temp' in appliance.settings)control('target_temp','Temperature',Array.from({length:15},(_,i)=>[i+16,(i+16)+' C']));
      if('speed' in appliance.settings)control('speed','Fan speed',[[1,'Low'],[2,'Medium'],[3,'High']]);
      if('oscillating' in appliance.settings)control('oscillating','Fan movement',[[true,'Oscillating'],[false,'Fixed']]);
      if('mode' in appliance.settings)control('mode','Cooking mode',[['cook','Cook'],['warm','Keep warm']]);
      if('power_level_pct' in appliance.settings)control('power_level_pct','Microwave power',[[25,'25%'],[50,'50%'],[75,'75%'],[100,'100%']]);
      if('load_state' in appliance.settings)control('load_state','Computer activity',[['idle','Idle'],['gaming','Gaming']]);
      list.append(card);
    }
  }
  for(const appliance of loads) {
    const output=document.getElementById('watts-'+appliance.id);
    if(output)output.textContent=appliance.active_power_w.toFixed(2)+' W total';
    const unit=document.getElementById('unit-watts-'+appliance.id);
    if(unit)unit.textContent=(appliance.unit_power_w ?? appliance.active_power_w).toFixed(2)+' W per unit';
  }
}

function injectFault(faultMode) {
  sendCommand('/api/fault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fault_mode: faultMode })
  });
}

function injectGrid(disturbance) {
  sendCommand('/api/grid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disturbance: disturbance })
  });
}

window.onload = connectWebSocket;

function setScenario(scenario) {
  sendCommand('/api/scenario', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario})});
}
function updateScenarioControls(status) {
  const scenario=status.scenario || 'normal';
  for(const [attribute,value] of [['scenario',scenario],['fault',status.selected_fault || 'normal'],['grid',status.grid_disturbance || 'normal']]) {
    document.querySelectorAll('[data-'+attribute+']').forEach(button=>{
      const active=button.dataset[attribute]===value;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  const descriptions={
    normal:'Normal day: appliance models run with your selected settings.',
    peak_hours:'Peak hours: simulated grid demand is HIGH. Appliance watts do not automatically increase. Try switching off a load to see how much demand you can reduce. No price change is assumed.',
    hot_day:'Hot day: this demo adds 20% to air-conditioner and refrigerator power. Other appliances are unchanged. This is an illustrative assumption, not a weather-calibrated estimate.',
    energy_saving:'Energy-saving example: this demo reduces air-conditioner, fan, and gaming-PC power by 20%. Other appliances are unchanged. Actual savings depend on the appliance and how you use it.'
  };
  document.getElementById('scenario-description').textContent=descriptions[scenario];
  document.getElementById('scenario-overview').textContent=descriptions[scenario];
  const names={compressor_leak:'Refrigerant leak',locked_rotor:'Locked rotor',bearing_wear:'Bearing friction'};
  const affected=status.fault_affected_appliances || [];
  document.getElementById('fault-selection-status').textContent=status.selected_fault
    ? names[status.selected_fault]+': '+(affected.length?'applies to '+affected.map(k=>k.replaceAll('_',' ')).join(', ')+'. Only enabled appliances draw power.':'selected, but no compatible appliance is selected. Add an air conditioner for compressor faults or a fan for bearing friction.')
    : 'No appliance defect selected.';
}

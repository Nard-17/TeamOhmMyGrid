/**
 * meralcoEngine.js - Client-side Meralco Tariff & Budget Analytics Engine
 * Runs natively inside your React Native Mobile App.
 * Converts raw smart plug kWh & Watts into real Meralco bills,
 * bill-shock alerts, and "What-If" savings forecasts.
 */

// Baseline 2026 Meralco residential rate (~₱12.25/kWh)
export const MERALCO_BASE_RATE_PER_KWH = 12.25;

// Lifeline subsidy brackets (Republic Act 11552)
export const LIFELINE_BRACKETS = [
  { threshold: 20, discount: 1.00 }, // 0 - 20 kWh: 100% discount
  { threshold: 50, discount: 0.50 }, // 21 - 50 kWh: 50% discount
  { threshold: 70, discount: 0.35 }, // 51 - 70 kWh: 35% discount
  { threshold: 100, discount: 0.20 }, // 71 - 100 kWh: 20% discount
];

// Peak grid strain hours: 11:00 AM - 4:00 PM and 6:00 PM - 9:00 PM
export const PEAK_HOURS_RANGES = [
  { start: 11, end: 16 },
  { start: 18, end: 21 },
];

/**
 * Checks if current time is within Meralco peak strain hours.
 */
export function isPeakHour(date = new Date()) {
  const hour = date.getHours();
  return PEAK_HOURS_RANGES.some((r) => hour >= r.start && hour < r.end);
}

/**
 * Calculates electricity bill in PHP with Meralco lifeline discounts.
 */
export function computeMeralcoCost(totalKwh, baseRate = MERALCO_BASE_RATE_PER_KWH) {
  if (totalKwh <= 0) return 0;

  let effectiveRate = baseRate;
  for (const bracket of LIFELINE_BRACKETS) {
    if (totalKwh <= bracket.threshold) {
      effectiveRate = baseRate * (1 - bracket.discount);
      break;
    }
  }

  return Number((totalKwh * effectiveRate).toFixed(2));
}

/**
 * Autonomous Budget Agent:
 * Evaluates current consumption, predicts month-end bill shock, and generates Taglish alerts.
 */
export function evaluateBudget({
  totalKwh,
  activeWatts = 0,
  budgetLimit = 3500,
  simulatedDay = 12,
  daysInMonth = 30,
  baseRate = MERALCO_BASE_RATE_PER_KWH,
}) {
  const currentCost = computeMeralcoCost(totalKwh, baseRate);
  const daysElapsed = Math.max(1, simulatedDay);
  const remainingDays = Math.max(0, daysInMonth - daysElapsed);

  // Daily run rate + active load forecast
  const dailyHistorical = currentCost / daysElapsed;
  const activeAdditionalDaily = (activeWatts / 1000) * 8 * baseRate; // assuming 8h daily active use
  const projectedDaily = dailyHistorical * 0.7 + activeAdditionalDaily * 0.3;
  
  const projectedBill = Math.round(currentCost + projectedDaily * remainingDays);
  const overage = Math.max(0, projectedBill - budgetLimit);
  const consumedPct = Math.min(100, Number(((currentCost / budgetLimit) * 100).toFixed(1)));

  let status = 'ON_TRACK';
  let severity = 'normal';
  let taglishAlert = '';

  if (projectedBill > budgetLimit * 1.15) {
    status = 'BILL_SHOCK_CRITICAL';
    severity = 'critical';
    taglishAlert = `🚨 Naku! Sa ganitong konsumo, aabot ng ₱${projectedBill.toLocaleString()} ang bill mo! Lalampas ka ng ₱${overage.toLocaleString()} sa ₱${budgetLimit.toLocaleString()} budget limit mo. I-adjust ang Aircon o mag-eco timer na para mapababa ito agad!`;
  } else if (projectedBill > budgetLimit) {
    status = 'BUDGET_WARNING';
    severity = 'warning';
    taglishAlert = `⚠️ Paalala: Medyo mataas ang konsumo mo. Projected bill: ₱${projectedBill.toLocaleString()} (₱${overage.toLocaleString()} lagpas sa budget). Magbawas ng unnecessary load.`;
  } else {
    const headroom = budgetLimit - projectedBill;
    status = 'ON_TRACK';
    severity = 'normal';
    taglishAlert = `✅ Magaling! Pasok sa budget ang konsumo mo. Projected bill: ₱${projectedBill.toLocaleString()}. May natitira kang ₱${headroom.toLocaleString()} buffer ngayong buwan.`;
  }

  return {
    currentCost,
    projectedBill,
    budgetLimit,
    overage,
    consumedPct,
    daysElapsed,
    remainingDays,
    status,
    severity,
    taglishAlert,
  };
}

/**
 * "What-If" Watt-Calculator (Calculated inside the App):
 * Gives instant financial forecasting on user behavioral changes.
 */
export function calculateWhatIfSavings(scenarioType, details = {}, baseRate = MERALCO_BASE_RATE_PER_KWH) {
  const hoursPerDay = details.hoursPerDay || 8;
  const daysPerMonth = details.daysPerMonth || 30;

  if (scenarioType === 'ac_temperature') {
    const fromTemp = details.fromTemp || 20;
    const toTemp = details.toTemp || 24;
    const tempDiff = Math.max(0, toTemp - fromTemp);

    const baseWatts = Math.max(400, 950 - (20 - fromTemp) * 75);
    const propWatts = Math.max(350, baseWatts - tempDiff * 75);
    const deltaWatts = baseWatts - propWatts;

    const monthlyKwhSaved = (deltaWatts * hoursPerDay * daysPerMonth) / 1000;
    const monthlyPesosSaved = Number((monthlyKwhSaved * baseRate).toFixed(2));

    return {
      scenario: 'Air Conditioner Temperature Adjustment',
      monthlyKwhSaved: Number(monthlyKwhSaved.toFixed(1)),
      monthlyPesosSaved,
      taglishExplanation: `Kung itataas mo ang AC mo mula ${fromTemp}°C papuntang ${toTemp}°C (${hoursPerDay} hrs/araw), makakatipid ka ng mga ${monthlyKwhSaved.toFixed(1)} kWh kada buwan. Iyan ay katumbas ng bawas na ₱${monthlyPesosSaved.toLocaleString()} sa Meralco bill mo!`,
    };
  }

  if (scenarioType === 'vampire_load') {
    const standbyWatts = details.standbyWatts || 25;
    const offHours = details.offHours || 8;
    const monthlyKwh = (standbyWatts * offHours * 30) / 1000;
    const monthlyPesos = Number((monthlyKwh * baseRate).toFixed(2));

    return {
      scenario: 'Auto-cut Standby Phantom Load',
      monthlyKwhSaved: Number(monthlyKwh.toFixed(1)),
      monthlyPesosSaved: monthlyPesos,
      taglishExplanation: `Sa pag-off ng smart plug sa mga gamit na naka-standby habang tulog ka (8 oras), makakatipid ka ng humigit-kumulang ₱${monthlyPesos.toLocaleString()} kada buwan!`,
    };
  }

  return null;
}

export const MOCK_USER = {
  name: 'Maria Santos',
  accountNumber: '0192-8823-4410',
  serviceAddress: 'Brgy. San Antonio, Pasig City',
  tariffType: 'Residential (General)',
  ratePerKwh: 11.43,
  billingCycle: {
    start: 'Nov 1, 2026',
    end: 'Nov 30, 2026',
    currentDay: 21,
    totalDays: 30,
    daysRemaining: 9,
  },
  budget: {
    ceiling: 3500,
    spentSoFar: 2840,
    kwhConsumed: 248.5,
    projectedMonthEnd: 3890,
    projectedExcess: 390,
  },
};

export const MOCK_PEAK_ALERT = {
  isPeak: true,
  alertLevel: 'RED ALERT',
  timeWindow: '2:00 PM – 5:00 PM',
  title: '⚡ Peak Grid Demand Alert',
  subtitle: 'Luzon Grid under high stress today',
  description:
    'Shifting high-draw appliances (Aircon, Plantsa, Washing Machine) after 6:00 PM helps avoid brownouts and saves you up to ₱180 this week.',
};

export const MOCK_APPLIANCES = [
  {
    id: 'aircon',
    name: 'Air Conditioner',
    subtext: '1.0 HP Inverter (Master BR)',
    percentage: 45,
    kwh: 111.8,
    cost: 1278.0,
    color: '#0F62FE',
    icon: 'snow-outline',
    status: 'Spike (+20%)',
    statusType: 'danger',
    tip: 'Raising temp from 20°C to 24°C saves ~₱480/mo.',
  },
  {
    id: 'fridge',
    name: 'Refrigerator',
    subtext: 'Two-Door No-Frost',
    percentage: 30,
    kwh: 74.5,
    cost: 852.0,
    color: '#10B981',
    icon: 'cube-outline',
    status: 'Normal',
    statusType: 'success',
    tip: 'Keep door seals clean and set dial to Medium.',
  },
  {
    id: 'waterheater',
    name: 'Water Heater & Iron',
    subtext: 'Shower heater & flat iron',
    percentage: 12,
    kwh: 29.8,
    cost: 341.0,
    color: '#F59E0B',
    icon: 'flame-outline',
    status: 'Moderate',
    statusType: 'warning',
    tip: 'Schedule clothes ironing in one batch on weekend mornings.',
  },
  {
    id: 'lighting',
    name: 'Lighting & Fans',
    subtext: '8 LED bulbs & 2 stand fans',
    percentage: 8,
    kwh: 19.9,
    cost: 227.0,
    color: '#8B5CF6',
    icon: 'bulb-outline',
    status: 'Optimized',
    statusType: 'success',
    tip: 'Good job! LED lighting consumes 80% less energy.',
  },
  {
    id: 'standby',
    name: 'Vampire / Standby Load',
    subtext: 'TV box, Wi-Fi, microwave, phone chargers',
    percentage: 5,
    kwh: 12.5,
    cost: 142.0,
    color: '#64748B',
    icon: 'power-outline',
    status: 'Idle Drain',
    statusType: 'warning',
    tip: 'Unplug chargers and appliance strips when not in use.',
  },
];

export const MOCK_BILL_BREAKDOWN = {
  lastMonthTotal: 3150,
  currentBillTotal: 3500,
  difference: 350,
  rateChange: '+₱0.32 / kWh',
  components: [
    { label: 'Generation Charge (Power Plants)', amount: 2024.11, percent: 58 },
    { label: 'Distribution Charge (Meralco Poles/Wires)', amount: 735.0, percent: 21 },
    { label: 'Transmission Charge (NGCP Grid)', amount: 315.0, percent: 9 },
    { label: 'Government Taxes & Universal Charge', amount: 425.89, percent: 12 },
  ],
};

export const INITIAL_CHAT_MESSAGES = [
  {
    id: 'msg-1',
    sender: 'bot',
    timestamp: '10:02 AM',
    text: 'Kumusta, Ka-Meralco Maria! 👋 Ako si Ate KuryenTipid, ang iyong personal AI Energy Advisor.',
  },
  {
    id: 'msg-2',
    sender: 'bot',
    timestamp: '10:02 AM',
    text: 'Napansin ko na ang projected bill mo ngayong buwan ay ₱3,500—mas mataas nang ₱350 kumpara noong nakaraang buwan (₱3,150). Gusto mo bang himayin natin kung bakit ito tumaas line-by-line?',
    hasBillCard: true,
  },
];

export const QUICK_PROMPTS = [
  'Bakit lumobo ang Aircon ko?',
  'Himayin ang Bill Line-by-Line 📋',
  'Paano ako makakatipid ng ₱500?',
  'Bakit may Peak-Hour Alert ngayon?',
];

export const BOT_RESPONSES = {
  'Bakit lumobo ang Aircon ko?': {
    text: 'Magandang tanong! 🌡️ Ayon sa smart disaggregation data natin:\n\n1. Lumobo ng 20% ang AC usage mo dahil sa 34°C heat index noong nakaraang 2 linggo.\n2. Naka-set ang AC sa 20°C sa loob ng 9 hours bawat gabi.\n\n💡 Tip: Kapag ini-adjust mo ang thermostat sa 24°C at gumamit ng electric fan, pareho pa rin ang lamig pero makakatipid ka agad ng humigit-kumulang ₱480 sa darating na buwan!',
  },
  'Himayin ang Bill Line-by-Line 📋': {
    text: 'Heto ang official breakdown ng ₱3,500 bill mo:\n\n• ⚡ Generation Charge (58%): ₱2,024.11 (Bayad sa power plants, tumaas ng ₱0.32/kWh dahil sa fuel costs sa global market)\n• 🗼 Transmission Charge (9%): ₱315.00 (Bayad sa National Grid)\n• 🔌 Distribution Charge (21%): ₱735.00 (Meralco poles and service—nananatiling fixed ang rate nito)\n• 🏛️ Gov Taxes & Subsidies (12%): ₱425.89 (VAT at Universal Charges)\n\nIbig sabihin, ang pagtaas ay galing sa combination ng mas mataas na generation cost at dagdag na konsumo sa bahay!',
  },
  'Paano ako makakatipid ng ₱500?': {
    text: 'Kayang-kaya natin maabot ang ₱500 savings bago matapos ang billing cycle! Heto ang 3 simpleng hakbang:\n\n1. ❄️ I-set ang Aircon sa 24°C sa halip na 20°C (Savings: ~₱320)\n2. 🔌 I-unplug ang TV box at appliance strips tuwing gabi (Savings: ~₱95)\n3. 🧺 Magplantsa nang sabay-sabay sa umaga bago mag-peak hours (Savings: ~₱110)\n\nKabuuang Projected Tipid: ₱525.00! Gusto mo bang i-activate ko ang AI reminder para dito?',
  },
  'Bakit may Peak-Hour Alert ngayon?': {
    text: '⚠️ Kasalukuyang nakakaranas ang Luzon Grid ng high power demand mula 2:00 PM hanggang 5:00 PM dahil sa init ng panahon.\n\nKapag sumasabay ang maraming appliances sa mga oras na ito, tumataas ang presyo ng kuryente sa WESM (Wholesale Electricity Spot Market) at may panganib ng yellow alert.\n\nKung ipagpapaliban mo ang paggamit ng washing machine at plantsa paglampas ng 6:00 PM, nakakatulong ka sa komunidad at naiiwasan mo ang over-budget!',
  },
};


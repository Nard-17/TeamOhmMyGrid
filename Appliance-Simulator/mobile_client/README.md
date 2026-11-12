# KuryenTipid Mobile Client Integration (React Native)

This folder contains the complete, ready-to-run React Native integration for **KuryenTipid**.

---

## 📁 Files Included
- **`useSmartPlug.js`**: React hook that connects to the live WebSocket telemetry stream (`/ws`) with auto-reconnect, and exposes control methods (`toggleRelay`, `setAppliance`, `calculateWhatIf`, `updateBudget`).
- **`SmartPlugScreen.jsx`**: Complete UI screen displaying live active watts, current Meralco bill, budget progress bar, proactive Taglish alert banners, peak strain badges, appliance selector, and the "What-If" Watt-Calculator.

---

## 🚀 How to Run with the Backend

### Step 1: Ensure the Backend is Running on Windows 11
In PowerShell from the project root:
```powershell
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```
- Open `http://localhost:8000` in your browser to confirm the live web dashboard is updating.

---

### Step 2: Connect from React Native

#### If using Android Emulator (Android Studio):
The default Android emulator alias for your host laptop is `10.0.2.2`:
```javascript
import SmartPlugScreen from './SmartPlugScreen';

export default function App() {
  return <SmartPlugScreen serverHost="10.0.2.2:8000" />;
}
```

#### If using iOS Simulator (Mac):
```javascript
export default function App() {
  return <SmartPlugScreen serverHost="localhost:8000" />;
}
```

#### If using a Physical Phone (Expo Go or APK):
1. **Option A (Same Wi-Fi):**
   Find your Windows 11 laptop's LAN IP:
   ```powershell
   ipconfig
   ```
   Look for `IPv4 Address` (e.g. `192.168.1.25`).
   Pass it to the screen:
   ```javascript
   export default function App() {
     return <SmartPlugScreen serverHost="192.168.1.25:8000" />;
   }
   ```

2. **Option B (Recommended for Hackathons with strict venue Wi-Fi / AP Client Isolation):**
   Run an instant zero-config tunnel on your Windows machine:
   ```powershell
   npx localtunnel --port 8000
   ```
   It gives you a public HTTPS URL like `https://funny-tiger-12.loca.lt`.
   Pass it to the screen:
   ```javascript
   export default function App() {
     return <SmartPlugScreen serverHost="funny-tiger-12.loca.lt" />;
   }
   ```
   Now your physical phone connects instantly from anywhere (even cellular 4G/5G)!

---

## ⚡ Starting a New Expo App (If your team doesn't have one yet)
```bash
npx create-expo-app KuryenTipidApp
cd KuryenTipidApp
```
Copy `useSmartPlug.js` and `SmartPlugScreen.jsx` into the app root, and in `App.js`:
```javascript
import React from 'react';
import SmartPlugScreen from './SmartPlugScreen';

export default function App() {
  return <SmartPlugScreen serverHost="10.0.2.2:8000" />;
}
```
Run `npx expo start`!

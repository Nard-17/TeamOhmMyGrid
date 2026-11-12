/**
 * SmartPlugScreen.jsx - Main React Native Screen for KuryenTipid
 * Demonstrates:
 * 1. Live raw telemetry consumption from Virtual Smart Plug (W, V, A, kWh)
 * 2. Mobile-side Meralco Tariff & Budget Calculation (₱3,500 ceiling)
 * 3. Autonomous Proactive Taglish Voice Alert
 * 4. In-App "What-If" Watt-Calculator
 * 5. Full support for all 11 appliances matching the Digital Twin
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSmartPlug, DEFAULT_SERVER_HOST } from './useSmartPlug';

// All 11 appliances matching the IoT Smart Plug Digital Twin
const APPLIANCES = [
  { name: 'Air Conditioner', icon: '❄️' },
  { name: 'Fan', icon: '🌀' },
  { name: 'Fridge', icon: '🧊' },
  { name: 'Washing Machine', icon: '🧺' },
  { name: 'Heater', icon: '🔥' },
  { name: 'Microwave', icon: '📡' },
  { name: 'Hairdryer', icon: '💨' },
  { name: 'Laptop', icon: '💻' },
  { name: 'Vacuum', icon: '🧹' },
  { name: 'Compact Fluorescent Lamp', icon: '🔆' },
  { name: 'Incandescent Light Bulb', icon: '💡' },
];

export default function SmartPlugScreen({ serverHost = DEFAULT_SERVER_HOST }) {
  const {
    electrical,
    energy,
    relayState,
    connectedLoad,
    budget,
    grid,
    isConnected,
    toggleRelay,
    setLoad,
    runWhatIf,
    whatIfResult,
  } = useSmartPlug(serverHost);

  const [selectedLoad, setSelectedLoad] = useState('Air Conditioner');
  const [acTemp, setAcTemp] = useState(22);

  const isRelayOn = relayState === 'ON';
  const watts = electrical?.power_active_w || 0;
  const currentCost = budget?.currentCost || 0;
  const projectedBill = budget?.projectedBill || 0;
  const budgetLimit = budget?.budgetLimit || 3500;
  const budgetPct = budget?.consumedPct || 0;

  const handleSelectAppliance = (name) => {
    setSelectedLoad(name);
    setLoad(name, { target_temp: acTemp });
  };

  const handleAdjustTemp = (delta) => {
    const next = Math.max(16, Math.min(28, acTemp + delta));
    setAcTemp(next);
    if (selectedLoad === 'Air Conditioner') {
      setLoad('Air Conditioner', { target_temp: next });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b132b" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoTitle}>Kuryen<Text style={styles.logoHighlight}>Tipid</Text></Text>
            <Text style={styles.teamSubtitle}>Ohm My Grid! &bull; Meralco IDOL Hackathon</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#2ec4b6' : '#e63946' }]} />
            <Text style={styles.statusText}>{isConnected ? 'PLUG LINKED' : 'OFFLINE'}</Text>
          </View>
        </View>

        {/* PEAK HOUR GRID ALERT */}
        {grid?.isPeakHour && (
          <View style={styles.peakBadge}>
            <Text style={styles.peakBadgeText}>⚡ MERALCO PEAK STRAIN HOURS (High Demand Period)</Text>
          </View>
        )}

        {/* AUTONOMOUS BUDGET AGENT ALERT BANNER (COMPUTED ON MOBILE) */}
        {budget?.taglishAlert ? (
          <View style={[
            styles.alertBanner,
            budget.severity === 'critical' ? styles.alertCritical :
            budget.severity === 'warning' ? styles.alertWarning : styles.alertNormal
          ]}>
            <Text style={styles.alertHeader}>
              {budget.severity === 'critical' ? '🚨 BILL SHOCK WARNING' :
               budget.severity === 'warning' ? '⚠️ BUDGET REMINDER' : '✅ BUDGET ON TRACK'}
            </Text>
            <Text style={styles.alertMessage}>{budget.taglishAlert}</Text>
          </View>
        ) : null}

        {/* LIVE RAW POWER METER CARD */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>SMART PLUG LIVE SENSOR TELEMETRY</Text>
          <View style={styles.wattsRow}>
            <Text style={styles.wattsValue}>{isRelayOn ? watts.toFixed(1) : '0.0'}</Text>
            <Text style={styles.wattsUnit}>W</Text>
          </View>
          <Text style={styles.electricalSub}>
            {electrical?.voltage_rms || 230.0}V &bull;{' '}
            {electrical?.current_rms || 0.00}A &bull;{' '}
            PF {electrical?.power_factor || 0.95} &bull;{' '}
            60.0Hz
          </Text>

          {/* HARDWARE RELAY SWITCH */}
          <TouchableOpacity
            style={[styles.relayButton, { backgroundColor: isRelayOn ? '#e63946' : '#2ec4b6' }]}
            onPress={() => toggleRelay()}
          >
            <Text style={styles.relayButtonText}>
              {isRelayOn ? 'TURN SMART PLUG RELAY OFF' : 'TURN SMART PLUG RELAY ON'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MERALCO BILLING & BUDGET TRACKER CARD (IN-APP ENGINE) */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>MERALCO BILLING ENGINE (IN-APP)</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Current Consumption</Text>
              <Text style={styles.metricPrice}>₱{currentCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.metricDetail}>{energy?.accumulated_kwh?.toFixed(1) || 0} kWh used</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Projected Month-End</Text>
              <Text style={[styles.metricPrice, { color: budget?.severity === 'critical' ? '#e63946' : '#f77f00' }]}>
                ₱{projectedBill.toLocaleString('en-US')}
              </Text>
              <Text style={styles.metricDetail}>Day {budget?.daysElapsed || 12} of 30</Text>
            </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressFill, { width: `${budgetPct}%`, backgroundColor: budget?.severity === 'critical' ? '#e63946' : '#2ec4b6' }]} />
          </View>
          <Text style={styles.budgetNote}>
            Monthly Ceiling: ₱{budgetLimit.toLocaleString('en-US')} ({budgetPct.toFixed(0)}% consumed)
          </Text>
        </View>

        {/* SIMULATE APPLIANCE PLUGGED IN */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>CHANGE PLUGGED APPLIANCE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.applianceRow}>
            {APPLIANCES.map((app) => (
              <TouchableOpacity
                key={app.name}
                style={[
                  styles.applianceChip,
                  (connectedLoad === app.name || selectedLoad === app.name) && styles.applianceChipActive,
                ]}
                onPress={() => handleSelectAppliance(app.name)}
              >
                <Text style={styles.applianceIcon}>{app.icon}</Text>
                <Text style={[
                  styles.applianceName,
                  (connectedLoad === app.name || selectedLoad === app.name) && styles.applianceNameActive,
                ]}>
                  {app.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AC TEMPERATURE CONTROLS */}
          {selectedLoad === 'Air Conditioner' && (
            <View style={styles.tempControlRow}>
              <Text style={styles.tempLabel}>Thermostat Setpoint:</Text>
              <View style={styles.tempButtonContainer}>
                <TouchableOpacity style={styles.tempBtn} onPress={() => handleAdjustTemp(-1)}>
                  <Text style={styles.tempBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.tempValueText}>{acTemp}°C</Text>
                <TouchableOpacity style={styles.tempBtn} onPress={() => handleAdjustTemp(+1)}>
                  <Text style={styles.tempBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* "WHAT-IF" WATT-CALCULATOR (IN-APP FEATURE) */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>💡 "WHAT-IF" WATT-CALCULATOR</Text>
          <Text style={styles.whatIfSubtitle}>
            Forecast financial savings on your Meralco bill before adjusting your habits.
          </Text>

          <TouchableOpacity
            style={styles.whatIfBtn}
            onPress={() => runWhatIf('ac_temperature', { fromTemp: 20, toTemp: 24, hoursPerDay: 8 })}
          >
            <Text style={styles.whatIfBtnText}>Simulate: Set Aircon from 20°C &rarr; 24°C</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.whatIfBtn, { backgroundColor: '#334155', marginTop: 8 }]}
            onPress={() => runWhatIf('vampire_load', { standbyWatts: 25, offHours: 8 })}
          >
            <Text style={styles.whatIfBtnText}>Simulate: Cut Standby Vampire Load Overnight</Text>
          </TouchableOpacity>

          {whatIfResult && (
            <View style={styles.whatIfResultBox}>
              <Text style={styles.whatIfResultSavings}>
                💰 Forecast Savings: ₱{whatIfResult.monthlyPesosSaved}/month ({whatIfResult.monthlyKwhSaved} kWh)
              </Text>
              <Text style={styles.whatIfResultExplanation}>
                {whatIfResult.taglishExplanation}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b132b' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  logoTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoHighlight: { color: '#f77f00' },
  teamSubtitle: { fontSize: 12, color: '#94a3b8' },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c2541', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  peakBadge: { backgroundColor: 'rgba(230, 57, 70, 0.25)', borderColor: '#e63946', borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 15, alignItems: 'center' },
  peakBadgeText: { color: '#fecaca', fontSize: 12, fontWeight: '700' },
  alertBanner: { borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 1.5 },
  alertCritical: { backgroundColor: 'rgba(230, 57, 70, 0.2)', borderColor: '#e63946' },
  alertWarning: { backgroundColor: 'rgba(247, 127, 0, 0.2)', borderColor: '#f77f00' },
  alertNormal: { backgroundColor: 'rgba(46, 196, 182, 0.2)', borderColor: '#2ec4b6' },
  alertHeader: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  alertMessage: { fontSize: 14, color: '#f1f5f9', lineHeight: 20 },
  card: { backgroundColor: '#1c2541', borderRadius: 18, padding: 18, marginBottom: 16, borderColor: '#3a506b', borderWidth: 1 },
  cardHeader: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 12 },
  wattsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  wattsValue: { fontSize: 44, fontWeight: '900', color: '#fff' },
  wattsUnit: { fontSize: 20, fontWeight: '600', color: '#94a3b8', marginLeft: 6 },
  electricalSub: { fontSize: 12, color: '#cbd5e1', marginBottom: 14 },
  relayButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  relayButtonText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  metricPrice: { fontSize: 22, fontWeight: '800', color: '#f77f00', marginBottom: 2 },
  metricDetail: { fontSize: 11, color: '#cbd5e1' },
  progressContainer: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%' },
  budgetNote: { fontSize: 11, color: '#94a3b8' },
  applianceRow: { flexDirection: 'row', marginBottom: 10 },
  applianceChip: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, alignItems: 'center', borderColor: '#334155', borderWidth: 1 },
  applianceChipActive: { borderColor: '#f77f00', backgroundColor: 'rgba(247, 127, 0, 0.15)' },
  applianceIcon: { fontSize: 20, marginBottom: 4 },
  applianceName: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  applianceNameActive: { color: '#fff', fontWeight: '700' },
  tempControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopColor: '#334155', borderTopWidth: 1 },
  tempLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  tempButtonContainer: { flexDirection: 'row', alignItems: 'center' },
  tempBtn: { backgroundColor: '#334155', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tempBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tempValueText: { color: '#48cae4', fontSize: 16, fontWeight: '800', marginHorizontal: 12 },
  whatIfSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  whatIfBtn: { backgroundColor: '#f77f00', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center' },
  whatIfBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  whatIfResultBox: { marginTop: 14, backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderColor: '#2ec4b6', borderWidth: 1 },
  whatIfResultSavings: { fontSize: 15, fontWeight: '800', color: '#2ec4b6', marginBottom: 6 },
  whatIfResultExplanation: { fontSize: 13, color: '#cbd5e1', lineHeight: 18 },
});

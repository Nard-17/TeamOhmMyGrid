import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { MOCK_USER } from '../constants/mockData';

export default function SimulatorScreen({ navigation }) {
  // Simulator interactive state variables
  const [acTemp, setAcTemp] = useState(24); // 18°C to 26°C (baseline: 20°C)
  const [acHours, setAcHours] = useState(7); // 4 to 12 hours (baseline: 9 hours)
  const [unplugVampire, setUnplugVampire] = useState(true); // Standby loads
  const [shiftPeakHours, setShiftPeakHours] = useState(true); // Ironing & laundry off-peak
  const [fridgeEcoMode, setFridgeEcoMode] = useState(false); // Clean coils/seal check

  // Base parameters
  const baseBill = 3500;
  const baseAcTemp = 20;
  const baseAcHours = 9;

  // Calculation formula based on Meralco empirical load metrics:
  // 1. Each 1°C increase in AC thermostat saves approx ₱115/month
  const acTempDiff = Math.max(0, acTemp - baseAcTemp);
  const acTempSavings = acTempDiff * 115;

  // 2. Each 1 hour reduction in AC runtime saves approx ₱140/month
  const acHoursDiff = Math.max(0, baseAcHours - acHours);
  const acHoursSavings = acHoursDiff * 140;

  // 3. Vampire/Standby loads eliminated: ₱95/month
  const vampireSavings = unplugVampire ? 95 : 0;

  // 4. Load shifting out of peak (2-5 PM): ~₱160/month
  const peakShiftSavings = shiftPeakHours ? 160 : 0;

  // 5. Fridge Eco check: ₱110/month
  const fridgeSavings = fridgeEcoMode ? 110 : 0;

  // Total Projected Savings
  const totalSavings = Math.round(
    acTempSavings + acHoursSavings + vampireSavings + peakShiftSavings + fridgeSavings
  );

  const newProjectedBill = Math.max(0, baseBill - totalSavings);
  const isWithinBudget = newProjectedBill <= MOCK_USER.budget.ceiling;

  const handleApplyToAgent = () => {
    Alert.alert(
      '🤖 Autonomous Agent Configured!',
      `Ate KuryenTipid will now monitor your smart meter and proactively remind your household to keep AC at ${acTemp}°C and limit usage to ${acHours} hrs.\n\nProjected Monthly Savings: ₱${totalSavings.toLocaleString()}/mo.`,
      [
        {
          text: 'View Dashboard',
          onPress: () => navigation.navigate('Home'),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleReset = () => {
    setAcTemp(20);
    setAcHours(9);
    setUnplugVampire(false);
    setShiftPeakHours(false);
    setFridgeEcoMode(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>"What-If" Watt-Calculator</Text>
            <Text style={styles.subtitle}>
              Test behavioral habits & forecast your monthly bill savings
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Projected Savings Banner */}
        <View style={styles.heroSavingsCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTag}>
              <Ionicons name="trending-down" size={14} color={COLORS.success} />
              <Text style={styles.heroTagText}>Projected Impact</Text>
            </View>
            <View
              style={[
                styles.budgetStatusPill,
                { backgroundColor: isWithinBudget ? COLORS.successLight : COLORS.warningLight },
              ]}
            >
              <Text
                style={[
                  styles.budgetStatusText,
                  { color: isWithinBudget ? COLORS.successDark : COLORS.warningDark },
                ]}
              >
                {isWithinBudget ? '✓ Below ₱3,500 Budget' : '⚠️ Exceeds Budget'}
              </Text>
            </View>
          </View>

          <Text style={styles.savingsLabel}>Total Projected Monthly Savings</Text>
          <Text style={styles.savingsAmount}>₱{totalSavings.toLocaleString()}</Text>

          {/* Before & After Comparison */}
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonCol}>
              <Text style={styles.compHeader}>Original Projected</Text>
              <Text style={styles.compOriginal}>₱{baseBill.toLocaleString()}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={24} color={COLORS.primary} />
            <View style={styles.comparisonCol}>
              <Text style={styles.compHeader}>New Forecast</Text>
              <Text style={styles.compNew}>₱{newProjectedBill.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action button to sync with autonomous agent */}
          <TouchableOpacity
            style={styles.applyAgentButton}
            activeOpacity={0.85}
            onPress={handleApplyToAgent}
          >
            <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
            <Text style={styles.applyAgentButtonText}>Lock-In & Set Autonomous AI Guard</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Simulation Controls */}
        <Text style={styles.sectionHeader}>Adjust Appliance Behaviors</Text>

        {/* Control 1: AC Temperature Stepper */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={[styles.controlIconWrap, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="snow" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.controlTitleWrap}>
              <Text style={styles.controlTitle}>Air Conditioner Thermostat</Text>
              <Text style={styles.controlSubtitle}>
                Baseline: 20°C • Each +1°C saves approx ~₱115/mo
              </Text>
            </View>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, acTemp <= 18 && styles.stepBtnDisabled]}
              disabled={acTemp <= 18}
              onPress={() => setAcTemp((prev) => Math.max(18, prev - 1))}
            >
              <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={styles.valueDisplay}>
              <Text style={styles.tempValue}>{acTemp}°C</Text>
              <Text style={styles.tempSavingsTag}>
                {acTempDiff > 0 ? `+₱${acTempSavings}/mo saved` : 'Baseline (0 savings)'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.stepBtn, acTemp >= 27 && styles.stepBtnDisabled]}
              disabled={acTemp >= 27}
              onPress={() => setAcTemp((prev) => Math.min(27, prev + 1))}
            >
              <Ionicons name="add" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 Meralco Tip: 24°C–25°C paired with an electric fan provides optimal cooling while cutting compressor electricity by up to 28%.
            </Text>
          </View>
        </View>

        {/* Control 2: AC Operating Hours */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={[styles.controlIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="time" size={20} color={COLORS.purple} />
            </View>
            <View style={styles.controlTitleWrap}>
              <Text style={styles.controlTitle}>AC Daily Run Time</Text>
              <Text style={styles.controlSubtitle}>
                Baseline: 9 hrs/night • Each -1 hr saves ~₱140/mo
              </Text>
            </View>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, acHours <= 3 && styles.stepBtnDisabled]}
              disabled={acHours <= 3}
              onPress={() => setAcHours((prev) => Math.max(3, prev - 1))}
            >
              <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={styles.valueDisplay}>
              <Text style={styles.tempValue}>{acHours} Hours / day</Text>
              <Text style={styles.tempSavingsTag}>
                {acHoursDiff > 0 ? `+₱${acHoursSavings}/mo saved` : 'Baseline (0 savings)'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.stepBtn, acHours >= 14 && styles.stepBtnDisabled]}
              disabled={acHours >= 14}
              onPress={() => setAcHours((prev) => Math.min(14, prev + 1))}
            >
              <Ionicons name="add" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Control 3: Shift Peak Hours Toggle */}
        <View style={styles.toggleCard}>
          <View style={[styles.controlIconWrap, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="flash-off" size={20} color={COLORS.warningDark} />
          </View>
          <View style={styles.toggleTextWrap}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Shift Heavy Loads Off-Peak</Text>
              <Text style={styles.toggleSavingsBadge}>+₱160/mo</Text>
            </View>
            <Text style={styles.toggleSubtitle}>
              Run washing machine & flat iron before 11 AM or after 6 PM
            </Text>
          </View>
          <Switch
            value={shiftPeakHours}
            onValueChange={setShiftPeakHours}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Control 4: Unplug Vampire Loads Toggle */}
        <View style={styles.toggleCard}>
          <View style={[styles.controlIconWrap, { backgroundColor: COLORS.surfaceAlt }]}>
            <Ionicons name="power" size={20} color={COLORS.textSecondary} />
          </View>
          <View style={styles.toggleTextWrap}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Unplug Vampire / Idle Loads</Text>
              <Text style={styles.toggleSavingsBadge}>+₱95/mo</Text>
            </View>
            <Text style={styles.toggleSubtitle}>
              Switch off TV boxes, microwave, and chargers when not in use
            </Text>
          </View>
          <Switch
            value={unplugVampire}
            onValueChange={setUnplugVampire}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Control 5: Refrigerator Eco-Habit Toggle */}
        <View style={styles.toggleCard}>
          <View style={[styles.controlIconWrap, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="leaf" size={20} color={COLORS.success} />
          </View>
          <View style={styles.toggleTextWrap}>
            <View style={styles.toggleTitleRow}>
              <Text style={styles.toggleTitle}>Refrigerator Eco Maintenance</Text>
              <Text style={styles.toggleSavingsBadge}>+₱110/mo</Text>
            </View>
            <Text style={styles.toggleSubtitle}>
              Check rubber door seal tightness & clean dust off back coils
            </Text>
          </View>
          <Switch
            value={fridgeEcoMode}
            onValueChange={setFridgeEcoMode}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 260,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  heroSavingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successDark,
    marginLeft: 4,
  },
  budgetStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  budgetStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  savingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: 14,
    marginVertical: 12,
  },
  comparisonCol: {
    flex: 1,
  },
  compHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  compOriginal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  compNew: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  applyAgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
  },
  applyAgentButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  controlCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  controlIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  controlTitleWrap: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  controlSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  valueDisplay: {
    alignItems: 'center',
  },
  tempValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tempSavingsTag: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#166534',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleSavingsBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  toggleSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});


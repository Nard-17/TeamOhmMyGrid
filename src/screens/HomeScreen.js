import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { MOCK_USER, MOCK_PEAK_ALERT, MOCK_APPLIANCES } from '../constants/mockData';
import CircularProgress from '../components/CircularProgress';
import PeakAlertBanner from '../components/PeakAlertBanner';

export default function HomeScreen({ navigation }) {
  const [selectedAppliance, setSelectedAppliance] = useState(null);

  const { budget, billingCycle, ratePerKwh } = MOCK_USER;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Header Bar */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="flash" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.appName}>Kuryen<Text style={styles.appNameHighlight}>Tipid</Text></Text>
            </View>
            <Text style={styles.userSubtitle}>
              {MOCK_USER.name} • {MOCK_USER.accountNumber}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        {/* Peak-Hour Grid Alert Banner */}
        <PeakAlertBanner alert={MOCK_PEAK_ALERT} />

        {/* Autonomous Budget Agent Tracker Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Autonomous Budget Agent</Text>
              <Text style={styles.cardSubtitle}>
                Cycle: {billingCycle.start} – {billingCycle.end} (Day {billingCycle.currentDay}/30)
              </Text>
            </View>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} />
              <Text style={styles.aiTagText}>AI Active</Text>
            </View>
          </View>

          {/* Prominent Circular Progress Bar */}
          <CircularProgress
            spent={budget.spentSoFar}
            ceiling={budget.ceiling}
            daysLeft={billingCycle.daysRemaining}
          />

          {/* Proactive Agent Forecast / Warning Box */}
          <View style={styles.forecastBox}>
            <View style={styles.forecastIconCol}>
              <Ionicons name="alert-circle" size={22} color={COLORS.warningDark} />
            </View>
            <View style={styles.forecastTextCol}>
              <Text style={styles.forecastTitle}>Proactive Bill Shock Warning</Text>
              <Text style={styles.forecastBody}>
                At your current pace, month-end bill will reach{' '}
                <Text style={styles.boldRed}>₱{budget.projectedMonthEnd.toLocaleString()}</Text> (
                <Text style={styles.boldRed}>+₱{budget.projectedExcess}</Text> over budget).
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.trackerActionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Simulator')}
            >
              <Ionicons name="calculator-outline" size={16} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Simulate Fix</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Ate Tipid AI Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Grid & Tariff Snapshot */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.metricValue}>{budget.kwhConsumed} kWh</Text>
            <Text style={styles.metricLabel}>Total Consumed</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="pricetag-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.metricValue}>₱{ratePerKwh} / kWh</Text>
            <Text style={styles.metricLabel}>Effective Tariff</Text>
          </View>
        </View>

        {/* Appliance-Level Breakdown (NILM) */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Appliance Disaggregation (NILM)</Text>
            <Text style={styles.sectionSubtitle}>Smart meter AI load breakdown</Text>
          </View>
          <View style={styles.nilmPill}>
            <Text style={styles.nilmPillText}>AI Estimated</Text>
          </View>
        </View>

        {/* Multi-Segment Proportional Bar */}
        <View style={styles.segmentedBar}>
          {MOCK_APPLIANCES.map((app) => (
            <View
              key={app.id}
              style={{
                width: `${app.percentage}%`,
                height: 12,
                backgroundColor: app.color,
                borderRadius: 2,
              }}
            />
          ))}
        </View>

        {/* Appliance List Cards */}
        <View style={styles.applianceList}>
          {MOCK_APPLIANCES.map((app) => {
            const isSelected = selectedAppliance === app.id;
            return (
              <TouchableOpacity
                key={app.id}
                activeOpacity={0.85}
                onPress={() => setSelectedAppliance(isSelected ? null : app.id)}
                style={[styles.applianceCard, isSelected && styles.applianceCardActive]}
              >
                <View style={styles.applianceMainRow}>
                  <View style={[styles.applianceIconWrap, { backgroundColor: `${app.color}18` }]}>
                    <Ionicons name={app.icon} size={22} color={app.color} />
                  </View>

                  <View style={styles.applianceInfo}>
                    <View style={styles.applianceTitleRow}>
                      <Text style={styles.applianceName}>{app.name}</Text>
                      <View
                        style={[
                          styles.applianceBadge,
                          app.statusType === 'danger' && styles.badgeDanger,
                          app.statusType === 'warning' && styles.badgeWarning,
                          app.statusType === 'success' && styles.badgeSuccess,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            app.statusType === 'danger' && styles.badgeTextDanger,
                            app.statusType === 'warning' && styles.badgeTextWarning,
                            app.statusType === 'success' && styles.badgeTextSuccess,
                          ]}
                        >
                          {app.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.applianceSubtext}>{app.subtext}</Text>
                  </View>

                  <View style={styles.applianceFigures}>
                    <Text style={styles.applianceCost}>₱{app.cost.toFixed(0)}</Text>
                    <Text style={styles.appliancePercent}>{app.percentage}% of bill</Text>
                  </View>
                </View>

                {/* Quick Recommendation / Tip Drawer */}
                {isSelected && (
                  <View style={styles.applianceTipBox}>
                    <View style={styles.tipIconWrap}>
                      <Ionicons name="bulb" size={14} color={COLORS.primary} />
                    </View>
                    <Text style={styles.applianceTipText}>{app.tip}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  appNameHighlight: {
    color: COLORS.primary,
  },
  userSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    position: 'absolute',
    top: 9,
    right: 10,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 4,
  },
  forecastBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  forecastIconCol: {
    marginRight: 10,
    marginTop: 1,
  },
  forecastTextCol: {
    flex: 1,
  },
  forecastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  forecastBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#78350F',
  },
  boldRed: {
    fontWeight: '700',
    color: COLORS.danger,
  },
  trackerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  primaryButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  nilmPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nilmPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceAlt,
    gap: 2,
  },
  applianceList: {
    marginHorizontal: 16,
    gap: 10,
  },
  applianceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applianceCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAFCFF',
  },
  applianceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applianceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applianceName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  applianceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeDanger: {
    backgroundColor: COLORS.dangerLight,
  },
  badgeWarning: {
    backgroundColor: COLORS.warningLight,
  },
  badgeSuccess: {
    backgroundColor: COLORS.successLight,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  badgeTextDanger: {
    color: COLORS.danger,
  },
  badgeTextWarning: {
    color: COLORS.warningDark,
  },
  badgeTextSuccess: {
    color: COLORS.successDark,
  },
  applianceSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  applianceFigures: {
    alignItems: 'flex-end',
  },
  applianceCost: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  appliancePercent: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  applianceTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  tipIconWrap: {
    marginRight: 8,
  },
  applianceTipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 16,
    fontWeight: '500',
  },
});


import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from '../constants/colors';

export default function CircularProgress({
  size = 220,
  strokeWidth = 18,
  spent = 2840,
  ceiling = 3500,
  daysLeft = 9,
}) {
  const percentage = Math.min(Math.round((spent / ceiling) * 100), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  // Determine progress color based on budget thresholds
  let progressColor = COLORS.primary;
  let statusBadgeBg = COLORS.primaryLight;
  let statusTextColor = COLORS.primaryDark;
  let statusText = 'On Track';

  if (percentage >= 90) {
    progressColor = COLORS.danger;
    statusBadgeBg = COLORS.dangerLight;
    statusTextColor = COLORS.danger;
    statusText = 'Critical Risk';
  } else if (percentage >= 75) {
    progressColor = COLORS.warning;
    statusBadgeBg = COLORS.warningLight;
    statusTextColor = COLORS.warningDark;
    statusText = 'Caution (81%)';
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated/Active Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>

      {/* Center Informational Content */}
      <View style={styles.content}>
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
            {statusText}
          </Text>
        </View>

        <Text style={styles.spentLabel}>Current Spend</Text>
        <Text style={styles.spentAmount}>₱{spent.toLocaleString()}</Text>

        <View style={styles.divider} />

        <Text style={styles.ceilingLabel}>Limit: ₱{ceiling.toLocaleString()}</Text>
        <Text style={styles.daysBadge}>⏳ {daysLeft} days remaining</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  spentLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spentAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  ceilingLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  daysBadge: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
});


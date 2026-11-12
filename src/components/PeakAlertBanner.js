import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function PeakAlertBanner({ alert }) {
  const [expanded, setExpanded] = useState(false);

  if (!alert || !alert.isPeak) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="flash" size={20} color="#D97706" />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.alertTag}>
              <Text style={styles.alertTagText}>{alert.alertLevel}</Text>
            </View>
            <Text style={styles.timeTag}>⏰ {alert.timeWindow}</Text>
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.subtitle}>{alert.subtitle}</Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.warningDark}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <Text style={styles.description}>{alert.description}</Text>
          <View style={styles.actionRow}>
            <View style={styles.tipBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.tipBadgeText}>Load Shifting Recommended</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  alertTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginRight: 6,
  },
  alertTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeTag: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 1,
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  tipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
    marginLeft: 5,
  },
});


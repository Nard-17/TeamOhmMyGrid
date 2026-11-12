// ==============================================================================
// Bottom Navigation Bar matching the KuryenTipid UI screenshots
// Features: Home, Bill, Floating Tanong (Mic), Alerts, Profile
// ==============================================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BottomNavBarProps {
  activeTab: 'Home' | 'Bill' | 'Tanong' | 'Alerts' | 'Profile';
  onTabPress: (tab: 'Home' | 'Bill' | 'Tanong' | 'Alerts' | 'Profile') => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('Home')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeTab === 'Home' && styles.tabIconActive]}>⌂</Text>
        <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('Bill')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeTab === 'Bill' && styles.tabIconActive]}>⊟</Text>
        <Text style={[styles.tabLabel, activeTab === 'Bill' && styles.tabLabelActive]}>Bill</Text>
      </TouchableOpacity>

      {/* Floating Center Voice Button (Tanong) */}
      <View style={styles.centerContainer}>
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => onTabPress('Tanong')}
          activeOpacity={0.85}
        >
          <Text style={styles.centerButtonIcon}>🎙️</Text>
        </TouchableOpacity>
        <Text style={[styles.tabLabel, activeTab === 'Tanong' && styles.tabLabelActive]}>
          Tanong
        </Text>
      </View>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('Alerts')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeTab === 'Alerts' && styles.tabIconActive]}>🔔</Text>
        <Text style={[styles.tabLabel, activeTab === 'Alerts' && styles.tabLabelActive]}>Alerts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('Profile')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, activeTab === 'Profile' && styles.tabIconActive]}>👤</Text>
        <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 32,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 2,
  },
  tabIconActive: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    marginTop: -24,
    flex: 1,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 2,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  centerButtonIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
});

// ==============================================================================
// Screen 1: Welcome & Onboarding
// Follows the layout of Image 2, tailored for Electricity & Energy Management
// ==============================================================================

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ElectricityIllustration } from '../components/ElectricityIllustration';
import { useAuth } from '../context/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.pageBackground}
      showsVerticalScrollIndicator={false}
    >
      {/* Mobile Card Container matching the uploaded design */}
      <View style={styles.phoneCard}>
        {/* Top Electricity & Smart Home Illustration */}
        <View style={styles.illustrationWrapper}>
          <ElectricityIllustration width={270} height={230} />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.headingBlack}>Control Your</Text>
          <Text style={styles.headingOrange}>Electricity Costs here</Text>

          <Text style={styles.subtitle}>
            Explore real-time smart meter tracking, proactive monthly budgets, and conversational Taglish energy analytics.
          </Text>
        </View>

        {/* Bottom Dual Action Buttons matching Image 2 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/register')}
            activeOpacity={0.7}
          >
            <Text style={styles.registerBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageBackground: {
    flexGrow: 1,
    backgroundColor: '#faf2ec', // Warm peach/cream background matching Image 2
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#faf2ec',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    paddingVertical: 36,
    paddingHorizontal: 26,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 640,
  },
  illustrationWrapper: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 36,
    paddingHorizontal: 4,
  },
  headingBlack: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  headingOrange: {
    fontSize: 27,
    fontWeight: '800',
    color: '#ea580c',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: 2,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 'auto',
  },
  loginBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  registerBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  registerBtnText: {
    color: '#0f172a',
    fontSize: 15.5,
    fontWeight: '700',
  },
});

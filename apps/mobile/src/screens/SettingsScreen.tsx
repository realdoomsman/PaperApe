import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { useMode } from '../providers/ModeProvider';
import { getSettings, saveSettings, type AppSettings } from '../lib/storage';
import { colors, typography, spacing, radii, shadows } from '../theme';

const PRIORITY_FEE_OPTIONS = [
  { label: 'Low', value: 0.001 },
  { label: 'Medium', value: 0.005 },
  { label: 'High', value: 0.01 },
  { label: 'Turbo', value: 0.05 },
];

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const { mode, setMode } = useMode();

  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    confirmTrades: true,
    autoRefresh: true,
    refreshInterval: 10,
    priorityFee: 0.005,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    loadSettings().finally(() => setLoading(false));
  }, [loadSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  }, [loadSettings]);

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to sign out');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Signed in as</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trading Mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'beginner' && styles.modeActive]}
              onPress={() => setMode('beginner')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mode === 'beginner' && styles.modeTextActive]}>
                🐣 Beginner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'pro' && styles.modeActive]}
              onPress={() => setMode('pro')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mode === 'pro' && styles.modeTextActive]}>
                🦍 Pro
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Sound Effects</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(val) => updateSetting('soundEnabled', val)}
                trackColor={{ false: colors.bg2, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Trade Confirmations</Text>
              <Switch
                value={settings.confirmTrades}
                onValueChange={(val) => updateSetting('confirmTrades', val)}
                trackColor={{ false: colors.bg2, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Auto-Refresh</Text>
              <Switch
                value={settings.autoRefresh}
                onValueChange={(val) => updateSetting('autoRefresh', val)}
                trackColor={{ false: colors.bg2, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Priority Fee */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority Fee</Text>
          <View style={styles.feeRow}>
            {PRIORITY_FEE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.feeButton,
                  settings.priorityFee === opt.value && styles.feeActive,
                ]}
                onPress={() => updateSetting('priorityFee', opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.feeText,
                    settings.priorityFee === opt.value && styles.feeTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.feeValue,
                    settings.priorityFee === opt.value && styles.feeValueActive,
                  ]}
                >
                  {opt.value} SOL
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>PaperApe v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    color: colors.t0,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 14,
    color: colors.t2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border1,
    ...shadows.card,
  },
  cardLabel: {
    ...typography.body,
    fontSize: 12,
    color: colors.t2,
    marginBottom: spacing.xs,
  },
  cardValue: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.t0,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.bg1,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border1,
  },
  modeActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  modeText: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.t1,
  },
  modeTextActive: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    ...typography.body,
    fontSize: 15,
    color: colors.t0,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border0,
    marginVertical: spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  feeButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border1,
    ...shadows.card,
  },
  feeActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  feeText: {
    ...typography.bodyBold,
    fontSize: 12,
    color: colors.t1,
    marginBottom: 2,
  },
  feeTextActive: {
    color: colors.white,
  },
  feeValue: {
    ...typography.body,
    fontSize: 10,
    color: colors.t3,
  },
  feeValueActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  logoutButton: {
    backgroundColor: colors.red,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logoutText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  version: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
    textAlign: 'center',
  },
});

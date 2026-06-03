import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface Stats {
  portfolioValue: number;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, token, serverBalance, serverPositions } = useAuth();

  const [stats, setStats] = useState<Stats>({
    portfolioValue: 0,
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.displayName || user?.email || 'Trader';

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [posRes, histRes] = await Promise.all([
        apiRequest('GET', '/trades/positions', undefined, token),
        apiRequest('GET', '/trades/history', undefined, token),
      ]);

      const positions: any[] = posRes.data || [];
      const history: any[] = histRes.data || [];

      let portfolioValue = 0;
      positions.forEach((p: any) => {
        portfolioValue += p.current_value ?? p.amount_sol ?? 0;
      });

      let totalPnl = 0;
      let wins = 0;
      const closed = history.filter((t: any) => t.status === 'closed');
      closed.forEach((t: any) => {
        const pnl = t.pnl_sol ?? 0;
        totalPnl += pnl;
        if (pnl > 0) wins++;
      });

      setStats({
        portfolioValue,
        totalPnl,
        totalTrades: closed.length,
        winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const formatSol = (val: number | null) =>
    val !== null && val !== undefined ? `${val.toFixed(4)} SOL` : '—';

  const pnlColor = (val: number) => (val >= 0 ? colors.green : colors.red);
  const pnlPrefix = (val: number) => (val >= 0 ? '+' : '');

  const renderPositionCard = ({ item }: { item: any }) => {
    const pnlPct = item.pnl_percentage ?? 0;
    return (
      <View style={styles.positionCard}>
        <View style={styles.positionRow}>
          <Text style={styles.positionSymbol} numberOfLines={1}>
            {item.token_symbol || item.token_name || 'Unknown'}
          </Text>
          <Text style={[styles.positionPnl, { color: pnlColor(pnlPct) }]}>
            {pnlPrefix(pnlPct)}{pnlPct.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={styles.positionDetail}>
            Entry: ${item.entry_market_cap ? (item.entry_market_cap / 1000).toFixed(1) + 'K' : '—'}
          </Text>
          <Text style={styles.positionDetail}>
            {formatSol(item.amount_sol)}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeLabel}>Welcome back,</Text>
        <Text style={styles.welcomeName} numberOfLines={1}>{displayName}</Text>
      </View>

      {/* Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Paper Balance</Text>
        <Text style={styles.balanceValue}>{formatSol(serverBalance)}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Portfolio Value</Text>
          <Text style={styles.statValue}>{formatSol(stats.portfolioValue)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total PnL</Text>
          <Text style={[styles.statValue, { color: pnlColor(stats.totalPnl) }]}>
            {pnlPrefix(stats.totalPnl)}{stats.totalPnl.toFixed(4)} SOL
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Trades</Text>
          <Text style={styles.statValue}>{stats.totalTrades}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Win Rate</Text>
          <Text style={[styles.statValue, { color: pnlColor(stats.winRate - 50) }]}>
            {stats.winRate.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Start Trading Button */}
      <TouchableOpacity
        style={styles.tradeButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Terminal' })}
      >
        <Text style={styles.tradeButtonText}>🚀 Start Trading</Text>
      </TouchableOpacity>

      {/* Positions Header */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Open Positions</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.green} />
      ) : (
        <Text style={styles.emptyText}>
          No open positions. Tap "Start Trading" to begin!
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={serverPositions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPositionCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  welcomeSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  welcomeLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
  },
  welcomeName: {
    ...typography.heading,
    fontSize: 24,
    color: colors.t0,
    marginTop: spacing.xs,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border1,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  balanceLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.t2,
    marginBottom: spacing.sm,
  },
  balanceValue: {
    ...typography.heading,
    fontSize: 28,
    color: colors.t0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border1,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  statLabel: {
    ...typography.body,
    fontSize: 11,
    color: colors.t2,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.t0,
  },
  tradeButton: {
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tradeButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  errorBox: {
    backgroundColor: colors.redBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorText: {
    ...typography.body,
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.t0,
    marginBottom: spacing.md,
  },
  positionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border1,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  positionSymbol: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.t0,
    flex: 1,
  },
  positionPnl: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  positionDetail: {
    ...typography.body,
    fontSize: 12,
    color: colors.t2,
  },
  emptyState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    textAlign: 'center',
  },
});

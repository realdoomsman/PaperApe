import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';
import { colors, typography, spacing, radii, shadows } from '../theme';

interface AnalyticsData {
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalTrades: number;
}

const EMPTY_STATS: AnalyticsData = {
  totalPnl: 0,
  winRate: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  bestTrade: 0,
  worstTrade: 0,
  totalTrades: 0,
};

export default function AnalyticsScreen() {
  const { token } = useAuth();

  const [data, setData] = useState<AnalyticsData>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeStats = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await apiRequest<any[]>('GET', '/trades/history', undefined, token);
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load analytics');
        return;
      }

      const closed = res.data.filter((t: any) => t.status === 'closed');
      if (closed.length === 0) {
        setData(EMPTY_STATS);
        return;
      }

      let totalPnl = 0;
      let totalWins = 0;
      let totalLosses = 0;
      let winCount = 0;
      let lossCount = 0;
      let bestTrade = -Infinity;
      let worstTrade = Infinity;

      closed.forEach((t: any) => {
        const pnl = t.pnl_sol ?? 0;
        totalPnl += pnl;

        if (pnl > 0) {
          totalWins += pnl;
          winCount++;
        } else if (pnl < 0) {
          totalLosses += Math.abs(pnl);
          lossCount++;
        }

        if (pnl > bestTrade) bestTrade = pnl;
        if (pnl < worstTrade) worstTrade = pnl;
      });

      setData({
        totalPnl,
        winRate: closed.length > 0 ? (winCount / closed.length) * 100 : 0,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
        avgWin: winCount > 0 ? totalWins / winCount : 0,
        avgLoss: lossCount > 0 ? totalLosses / lossCount : 0,
        bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
        worstTrade: worstTrade === Infinity ? 0 : worstTrade,
        totalTrades: closed.length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to compute analytics');
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    computeStats().finally(() => setLoading(false));
  }, [computeStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await computeStats();
    setRefreshing(false);
  }, [computeStats]);

  const pnlColor = (val: number) => (val >= 0 ? colors.green : colors.red);
  const pnlPrefix = (val: number) => (val >= 0 ? '+' : '');

  const formatSol = (val: number) => `${pnlPrefix(val)}${val.toFixed(4)} SOL`;
  const formatPf = (val: number) => (val === Infinity ? '∞' : val.toFixed(2));

  interface StatCardProps {
    label: string;
    value: string;
    valueColor?: string;
  }

  const StatCard = ({ label, value, valueColor }: StatCardProps) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Crunching numbers...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title}>Trading Analytics</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {data.totalTrades === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>
              No closed trades yet. Complete some trades to see your analytics here.
            </Text>
          </View>
        ) : (
          <>
            {/* Headline PnL */}
            <View style={styles.headlineCard}>
              <Text style={styles.headlineLabel}>Total PnL</Text>
              <Text style={[styles.headlineValue, { color: pnlColor(data.totalPnl) }]}>
                {formatSol(data.totalPnl)}
              </Text>
              <Text style={styles.headlineSub}>
                {data.totalTrades} closed trade{data.totalTrades !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                label="Win Rate"
                value={`${data.winRate.toFixed(1)}%`}
                valueColor={pnlColor(data.winRate - 50)}
              />
              <StatCard
                label="Profit Factor"
                value={formatPf(data.profitFactor)}
                valueColor={data.profitFactor >= 1 ? colors.green : colors.red}
              />
              <StatCard
                label="Avg Win"
                value={formatSol(data.avgWin)}
                valueColor={colors.green}
              />
              <StatCard
                label="Avg Loss"
                value={`-${data.avgLoss.toFixed(4)} SOL`}
                valueColor={colors.red}
              />
              <StatCard
                label="Best Trade"
                value={formatSol(data.bestTrade)}
                valueColor={colors.green}
              />
              <StatCard
                label="Worst Trade"
                value={formatSol(data.worstTrade)}
                valueColor={colors.red}
              />
            </View>
          </>
        )}
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
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    color: colors.t0,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    marginTop: spacing.md,
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
  headlineCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border1,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.paper,
  },
  headlineLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.t2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  headlineValue: {
    ...typography.heading,
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  headlineSub: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.t0,
  },
  emptyState: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});

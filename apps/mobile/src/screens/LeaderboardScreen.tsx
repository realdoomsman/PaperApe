import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { apiRequest } from '../lib/api';

type TabKey = 'weekly' | 'monthly' | 'alltime';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  pnl: number;
  pnl_percent: number;
  win_rate: number;
  total_trades: number;
  avatar_url?: string;
}

const TABS: { key: TabKey; label: string; endpoint: string }[] = [
  { key: 'weekly', label: 'Weekly', endpoint: '/leaderboard/weekly' },
  { key: 'monthly', label: 'Monthly', endpoint: '/leaderboard/monthly' },
  { key: 'alltime', label: 'All Time', endpoint: '/leaderboard/alltime' },
];

const MEDAL_COLORS: Record<number, { bg: string; text: string; medal: string }> = {
  1: { bg: '#fef3c7', text: '#92400e', medal: '🥇' },
  2: { bg: '#f1f5f9', text: '#475569', medal: '🥈' },
  3: { bg: '#fef3c7', text: '#92400e', medal: '🥉' },
};

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const tab = TABS.find(t => t.key === activeTab)!;
    try {
      const res = await apiRequest<LeaderboardEntry[]>('GET', tab.endpoint);
      if (res.success && res.data) {
        setEntries(res.data);
      } else {
        setError(res.error || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const formatPnl = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    if (Math.abs(value) >= 1000) {
      return `${sign}${(value / 1000).toFixed(1)}K SOL`;
    }
    return `${sign}${value.toFixed(4)} SOL`;
  };

  const renderEntry = useCallback(({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const medalInfo = MEDAL_COLORS[item.rank];
    const pnlColor = item.pnl >= 0 ? colors.green : colors.red;

    return (
      <View style={[styles.entryRow, isTop3 && styles.entryRowTop3, isTop3 && { borderColor: medalInfo?.text + '40' }]}>
        {/* Rank */}
        <View style={[styles.rankContainer, isTop3 && { backgroundColor: medalInfo?.bg }]}>
          {isTop3 ? (
            <Text style={styles.medal}>{medalInfo?.medal}</Text>
          ) : (
            <Text style={styles.rankText}>#{item.rank}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, isTop3 && styles.usernameTop3]} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.tradesCount}>{item.total_trades} trades</Text>
        </View>

        {/* PnL */}
        <View style={styles.pnlContainer}>
          <Text style={[styles.pnlValue, { color: pnlColor }]}>
            {formatPnl(item.pnl)}
          </Text>
          <Text style={[styles.pnlPercent, { color: pnlColor }]}>
            {item.pnl_percent >= 0 ? '+' : ''}{item.pnl_percent.toFixed(1)}%
          </Text>
        </View>

        {/* Win Rate */}
        <View style={styles.winRateContainer}>
          <Text style={styles.winRateValue}>{item.win_rate.toFixed(0)}%</Text>
          <Text style={styles.winRateLabel}>Win</Text>
        </View>
      </View>
    );
  }, []);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
      <Text style={styles.headerSubtitle}>Top paper traders</Text>

      {/* Column Labels */}
      <View style={styles.columnLabels}>
        <Text style={[styles.columnLabel, { flex: 0.5 }]}>Rank</Text>
        <Text style={[styles.columnLabel, { flex: 1 }]}>Trader</Text>
        <Text style={[styles.columnLabel, { flex: 1, textAlign: 'right' }]}>PnL</Text>
        <Text style={[styles.columnLabel, { flex: 0.5, textAlign: 'right' }]}>Win %</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchLeaderboard()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => `${item.rank}-${item.user_id}`}
          renderItem={renderEntry}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No leaderboard data yet</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border0,
  },
  tabActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  tabText: {
    ...typography.body,
    fontSize: 13,
    color: colors.t2,
  },
  tabTextActive: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 24,
    color: colors.t0,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.t3,
    marginBottom: spacing.lg,
  },
  columnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border0,
  },
  columnLabel: {
    ...typography.body,
    fontSize: 10,
    color: colors.t3,
    textTransform: 'uppercase',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryRowTop3: {
    ...shadows.card,
    borderWidth: 1.5,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg1,
    marginRight: spacing.md,
  },
  medal: {
    fontSize: 20,
  },
  rankText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.t2,
  },
  userInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  username: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.t0,
  },
  usernameTop3: {
    ...typography.heading,
    fontSize: 14,
    color: colors.t0,
  },
  tradesCount: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
    marginTop: 2,
  },
  pnlContainer: {
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  pnlValue: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  pnlPercent: {
    ...typography.body,
    fontSize: 11,
    marginTop: 2,
  },
  winRateContainer: {
    alignItems: 'center',
    minWidth: 40,
  },
  winRateValue: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.t0,
  },
  winRateLabel: {
    ...typography.body,
    fontSize: 9,
    color: colors.t3,
    marginTop: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.red,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryText: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    textAlign: 'center',
  },
});

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
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';
import { colors, typography, spacing, radii, shadows } from '../theme';

type Tab = 'all' | 'open' | 'closed';

interface Trade {
  id: string;
  token_name?: string;
  token_symbol?: string;
  status: string;
  pnl_sol?: number;
  pnl_percentage?: number;
  amount_sol?: number;
  entry_date?: string;
  exit_date?: string;
  created_at?: string;
  closed_at?: string;
}

export default function HistoryScreen() {
  const { token } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await apiRequest<Trade[]>('GET', '/trades/history', undefined, token);
      if (res.success && res.data) {
        setTrades(res.data);
      } else {
        setError(res.error || 'Failed to load trade history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trade history');
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const filteredTrades = trades.filter((t) => {
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'closed') return t.status === 'closed';
    return true;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
    } catch {
      return '—';
    }
  };

  const formatSol = (val?: number) =>
    val !== undefined && val !== null ? `${val.toFixed(4)} SOL` : '—';

  const pnlColor = (val: number) => (val >= 0 ? colors.green : colors.red);
  const pnlPrefix = (val: number) => (val >= 0 ? '+' : '');

  const renderTradeCard = ({ item }: { item: Trade }) => {
    const pnl = item.pnl_sol ?? 0;
    const pnlPct = item.pnl_percentage ?? 0;
    const isClosed = item.status === 'closed';

    return (
      <View style={styles.tradeCard}>
        <View style={styles.tradeRow}>
          <View style={styles.tradeLeft}>
            <Text style={styles.tokenName} numberOfLines={1}>
              {item.token_symbol || item.token_name || 'Unknown'}
            </Text>
            <View style={[styles.statusBadge, isClosed ? styles.closedBadge : styles.openBadge]}>
              <Text style={[styles.statusText, isClosed ? styles.closedText : styles.openText]}>
                {isClosed ? 'CLOSED' : 'OPEN'}
              </Text>
            </View>
          </View>
          <View style={styles.tradeRight}>
            <Text style={[styles.tradePnl, { color: pnlColor(pnl) }]}>
              {pnlPrefix(pnl)}{pnl.toFixed(4)} SOL
            </Text>
            <Text style={[styles.tradePnlPct, { color: pnlColor(pnlPct) }]}>
              {pnlPrefix(pnlPct)}{pnlPct.toFixed(2)}%
            </Text>
          </View>
        </View>
        <View style={styles.tradeDetails}>
          <Text style={styles.tradeDetail}>
            Entry: {formatDate(item.entry_date || item.created_at)}
          </Text>
          {isClosed && (
            <Text style={styles.tradeDetail}>
              Exit: {formatDate(item.exit_date || item.closed_at)}
            </Text>
          )}
          <Text style={styles.tradeDetail}>{formatSol(item.amount_sol)}</Text>
        </View>
      </View>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.green} />
      ) : (
        <>
          <Text style={styles.emptyEmoji}>📜</Text>
          <Text style={styles.emptyText}>
            No trades yet. Go to Terminal to make your first paper trade.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['all', 'open', 'closed'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredTrades}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTradeCard}
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border0,
  },
  tabActive: {
    backgroundColor: colors.tabActive,
    borderColor: colors.tabActive,
  },
  tabText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.t2,
  },
  tabTextActive: {
    color: colors.white,
  },
  errorBox: {
    backgroundColor: colors.redBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorText: {
    ...typography.body,
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  tradeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border1,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tokenName: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.t0,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  openBadge: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.green,
  },
  closedBadge: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  statusText: {
    ...typography.bodyBold,
    fontSize: 10,
  },
  openText: {
    color: colors.green,
  },
  closedText: {
    color: colors.t2,
  },
  tradePnl: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  tradePnlPct: {
    ...typography.body,
    fontSize: 12,
    marginTop: 2,
  },
  tradeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tradeDetail: {
    ...typography.body,
    fontSize: 12,
    color: colors.t2,
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

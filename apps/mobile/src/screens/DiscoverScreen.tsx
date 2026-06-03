import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { apiRequest } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';

const WATCHLIST_KEY = '@paperape_watchlist';
const AUTO_REFRESH_MS = 10000;

type TabKey = 'trending' | 'trenches' | 'watchlist';

interface Token {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  change_24h: number;
  volume_24h: number;
  image_url?: string;
}

interface TrenchesData {
  new_pairs: Token[];
  final_stretch: Token[];
  migrated: Token[];
}

function formatMCap(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPrice(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function DiscoverScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<TabKey>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
  const [trenchesData, setTrenchesData] = useState<TrenchesData>({ new_pairs: [], final_stretch: [], migrated: [] });
  const [watchlist, setWatchlist] = useState<Token[]>([]);
  const [watchlistAddresses, setWatchlistAddresses] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load watchlist addresses from storage
  const loadWatchlistAddresses = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        setWatchlistAddresses(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveWatchlistAddresses = useCallback(async (addresses: string[]) => {
    try {
      await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(addresses));
    } catch {}
  }, []);

  const toggleWatchlist = useCallback(async (address: string) => {
    setWatchlistAddresses(prev => {
      const next = prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address];
      saveWatchlistAddresses(next);
      return next;
    });
  }, [saveWatchlistAddresses]);

  // Fetch data based on active tab
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      if (activeTab === 'trending') {
        const res = await apiRequest<Token[]>('GET', '/tokens/trending');
        if (res.success && res.data) {
          setTrendingTokens(res.data);
        } else {
          setError(res.error || 'Failed to load trending tokens');
        }
      } else if (activeTab === 'trenches') {
        const res = await apiRequest<TrenchesData>('GET', '/tokens/trenches');
        if (res.success && res.data) {
          setTrenchesData(res.data);
        } else {
          setError(res.error || 'Failed to load trenches');
        }
      } else if (activeTab === 'watchlist') {
        // Watchlist is local — nothing to fetch from server
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadWatchlistAddresses();
  }, [loadWatchlistAddresses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), AUTO_REFRESH_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchData]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const debounce = setTimeout(async () => {
      setIsSearching(true);
      const res = await apiRequest<Token[]>('GET', `/tokens/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleTokenSelect = useCallback((address: string) => {
    navigation.navigate('MainTabs', { screen: 'Terminal', params: { tokenAddress: address } });
  }, [navigation]);

  const isInWatchlist = useCallback((address: string) => watchlistAddresses.includes(address), [watchlistAddresses]);

  // Token row component
  const renderTokenRow = useCallback(({ item }: { item: Token }) => {
    const changeColor = item.change_24h >= 0 ? colors.green : colors.red;
    return (
      <TouchableOpacity
        style={styles.tokenRow}
        onPress={() => handleTokenSelect(item.address)}
        activeOpacity={0.7}
      >
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        </View>
        <View style={styles.tokenStats}>
          <Text style={styles.tokenPrice}>{formatPrice(item.price)}</Text>
          <Text style={styles.tokenMcap}>{formatMCap(item.market_cap)}</Text>
        </View>
        <View style={styles.tokenRight}>
          <Text style={[styles.tokenChange, { color: changeColor }]}>{formatChange(item.change_24h)}</Text>
          <Text style={styles.tokenVolume}>Vol {formatVolume(item.volume_24h)}</Text>
        </View>
        <TouchableOpacity
          style={styles.watchlistBtn}
          onPress={() => toggleWatchlist(item.address)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.watchlistIcon}>{isInWatchlist(item.address) ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleTokenSelect, toggleWatchlist, isInWatchlist]);

  // Trenches section list
  const trenchesSections = [
    { title: '🆕 New Pairs', data: trenchesData.new_pairs },
    { title: '🏁 Final Stretch', data: trenchesData.final_stretch },
    { title: '🦋 Migrated', data: trenchesData.migrated },
  ];

  const renderContent = () => {
    if (searchQuery.trim()) {
      return (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.address}
          renderItem={renderTokenRow}
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator style={styles.emptyLoader} color={colors.green} />
            ) : (
              <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'trending') {
      return (
        <FlatList
          data={trendingTokens}
          keyExtractor={item => item.address}
          renderItem={renderTokenRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No trending tokens</Text>}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (activeTab === 'trenches') {
      return (
        <SectionList
          sections={trenchesSections}
          keyExtractor={item => item.address}
          renderItem={renderTokenRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No trenches data</Text>}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      );
    }

    // Watchlist
    const watchlistTokens = trendingTokens.filter(t => watchlistAddresses.includes(t.address));
    return (
      <FlatList
        data={watchlistTokens}
        keyExtractor={item => item.address}
        renderItem={renderTokenRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>☆</Text>
            <Text style={styles.emptyText}>No tokens in watchlist</Text>
            <Text style={styles.emptySubtext}>Star tokens from Trending or Trenches to add them here</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'trending', label: '🔥 Trending' },
    { key: 'trenches', label: '⛏️ Trenches' },
    { key: 'watchlist', label: '⭐ Watchlist' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tokens..."
            placeholderTextColor={colors.t3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
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

      {/* Auto-refresh toggle */}
      <View style={styles.autoRefreshRow}>
        <Text style={styles.autoRefreshLabel}>Auto-refresh (10s)</Text>
        <Switch
          value={autoRefresh}
          onValueChange={setAutoRefresh}
          trackColor={{ false: colors.bg2, true: colors.greenDim }}
          thumbColor={autoRefresh ? colors.green : colors.t3}
        />
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.t0,
    padding: 0,
  },
  clearBtn: {
    ...typography.body,
    fontSize: 16,
    color: colors.t2,
    paddingLeft: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
    fontSize: 12,
    color: colors.t2,
  },
  tabTextActive: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 12,
  },
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  autoRefreshLabel: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  tokenInfo: {
    flex: 1.2,
    marginRight: spacing.sm,
  },
  tokenName: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.t0,
  },
  tokenSymbol: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
    marginTop: 2,
  },
  tokenStats: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  tokenPrice: {
    ...typography.mono,
    fontSize: 12,
    color: colors.t0,
  },
  tokenMcap: {
    ...typography.body,
    fontSize: 10,
    color: colors.t3,
    marginTop: 2,
  },
  tokenRight: {
    flex: 0.8,
    alignItems: 'flex-end',
    marginRight: spacing.xs,
  },
  tokenChange: {
    ...typography.bodyBold,
    fontSize: 12,
  },
  tokenVolume: {
    ...typography.body,
    fontSize: 10,
    color: colors.t3,
    marginTop: 2,
  },
  watchlistBtn: {
    padding: spacing.xs,
  },
  watchlistIcon: {
    fontSize: 20,
    color: colors.gold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 15,
    color: colors.t0,
  },
  sectionCount: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
    backgroundColor: colors.bg2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    overflow: 'hidden',
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
  emptyLoader: {
    marginTop: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.t3,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  emptySubtext: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

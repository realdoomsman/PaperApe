import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../providers/AuthProvider';
import { apiRequest } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { colors, spacing } from '../theme';
import * as Haptics from 'expo-haptics';

const QUICK_BUY = [0.1, 0.5, 1, 2, 5];
const QUICK_SELL = [25, 50, 100];

export default function TerminalScreen() {
  const { token, serverBalance, serverPositions } = useAuth();
  const [tokenAddress, setTokenAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [livePrice, setLivePrice] = useState<{ usd: number; sol: number } | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [sellPercent, setSellPercent] = useState(100);
  const [executing, setExecuting] = useState(false);

  // Current position for this token
  const currentPosition = serverPositions.find(
    (p: any) => p.token_address === tokenAddress && p.status === 'open'
  );

  // WebSocket for live prices
  const onPriceUpdate = useCallback((data: any) => {
    if (data.token_address === tokenAddress) {
      setLivePrice({ usd: data.price_usd, sol: data.price_sol });
    }
  }, [tokenAddress]);

  useWebSocket({ token, tokenAddress: tokenAddress || null, onPriceUpdate });

  // Search tokens
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await apiRequest('GET', `/tokens/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.success && res.data) {
        setSearchResults(Array.isArray(res.data) ? res.data : res.data.tokens || []);
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load token data
  const loadToken = async (address: string) => {
    setTokenAddress(address);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingToken(true);
    const res = await apiRequest('GET', `/tokens/${address}`);
    if (res.success && res.data) {
      setTokenData(res.data);
      if (res.data.price_usd) {
        setLivePrice({ usd: res.data.price_usd, sol: res.data.price_sol || 0 });
      }
    }
    setLoadingToken(false);
  };

  // Execute buy
  const executeBuy = async () => {
    if (!tokenAddress || !amount || !token) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setExecuting(true);
    try {
      const res = await apiRequest('POST', '/trades/buy', {
        token_address: tokenAddress,
        amount_sol: amountNum,
      }, token);

      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Trade Executed', `Bought ${tokenData?.symbol || 'token'} for ${amountNum} SOL`);
        setAmount('');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Trade Failed', res.error || 'Unknown error');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
    setExecuting(false);
  };

  // Execute sell
  const executeSell = async () => {
    if (!currentPosition || !token) return;

    setExecuting(true);
    try {
      const res = await apiRequest('POST', '/trades/sell', {
        position_id: currentPosition.id,
        percentage: sellPercent,
      }, token);

      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sold', `Sold ${sellPercent}% of position`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Sell Failed', res.error || 'Unknown error');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
    setExecuting(false);
  };

  // Calculate PnL
  const pnlPercent = currentPosition && livePrice
    ? ((livePrice.usd - (currentPosition.entry_price_usd || 0)) / (currentPosition.entry_price_usd || 1)) * 100
    : 0;

  const formatMcap = (val: number) => {
    if (!val) return '-';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search token or paste address..."
              placeholderTextColor={colors.t3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={colors.green} style={styles.searchSpinner} />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 8).map((t: any, i: number) => (
                <TouchableOpacity key={i} style={styles.searchResultItem} onPress={() => loadToken(t.address)}>
                  <Text style={styles.searchResultName}>{t.symbol || t.name}</Text>
                  <Text style={styles.searchResultMcap}>{formatMcap(t.market_cap || t.mcap)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Token Info */}
          {tokenData && (
            <View style={styles.tokenInfo}>
              <View style={styles.tokenHeader}>
                <Text style={styles.tokenSymbol}>{tokenData.symbol}</Text>
                <Text style={styles.tokenName}>{tokenData.name}</Text>
              </View>
              <View style={styles.tokenStats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>PRICE</Text>
                  <Text style={styles.statValue}>${livePrice?.usd?.toFixed(8) || tokenData.price_usd?.toFixed(8) || '-'}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>MCAP</Text>
                  <Text style={styles.statValue}>{formatMcap(tokenData.market_cap || tokenData.mcap)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>24H</Text>
                  <Text style={[styles.statValue, { color: (tokenData.price_change_24h || 0) >= 0 ? colors.green : colors.red }]}>
                    {(tokenData.price_change_24h || 0) >= 0 ? '+' : ''}{(tokenData.price_change_24h || 0).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>LIQ</Text>
                  <Text style={styles.statValue}>{formatMcap(tokenData.liquidity_usd || tokenData.liquidity)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Chart WebView */}
          {tokenAddress && (
            <View style={styles.chartContainer}>
              <WebView
                source={{ uri: `https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=dark&trades=0&info=0` }}
                style={styles.chart}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Trade Panel */}
          {tokenAddress && (
            <View style={styles.tradePanel}>
              {/* Mode Tabs */}
              <View style={styles.tradeTabs}>
                <TouchableOpacity
                  style={[styles.tradeTab, tradeMode === 'buy' && styles.tradeTabActive]}
                  onPress={() => setTradeMode('buy')}
                >
                  <Text style={[styles.tradeTabText, tradeMode === 'buy' && styles.tradeTabTextActive]}>BUY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tradeTab, tradeMode === 'sell' && styles.tradeTabActiveSell]}
                  onPress={() => setTradeMode('sell')}
                >
                  <Text style={[styles.tradeTabText, tradeMode === 'sell' && styles.tradeTabTextActive]}>SELL</Text>
                </TouchableOpacity>
              </View>

              {tradeMode === 'buy' ? (
                <View style={styles.tradeBody}>
                  <Text style={styles.balanceText}>Balance: {(serverBalance || 0).toFixed(4)} SOL</Text>
                  <View style={styles.quickAmounts}>
                    {QUICK_BUY.map(a => (
                      <TouchableOpacity
                        key={a}
                        style={[styles.quickBtn, amount === String(a) && styles.quickBtnActive]}
                        onPress={() => { setAmount(String(a)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      >
                        <Text style={[styles.quickBtnText, amount === String(a) && styles.quickBtnTextActive]}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Custom amount (SOL)"
                    placeholderTextColor={colors.t3}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={[styles.executeBtn, styles.buyBtn, executing && styles.disabledBtn]}
                    onPress={executeBuy}
                    disabled={executing || !amount}
                  >
                    {executing ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.executeBtnText}>BUY {tokenData?.symbol || ''}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.tradeBody}>
                  {currentPosition ? (
                    <>
                      <View style={styles.positionInfo}>
                        <Text style={styles.positionLabel}>Open Position</Text>
                        <Text style={[styles.positionPnl, { color: pnlPercent >= 0 ? colors.green : colors.red }]}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </Text>
                      </View>
                      <View style={styles.quickAmounts}>
                        {QUICK_SELL.map(p => (
                          <TouchableOpacity
                            key={p}
                            style={[styles.quickBtn, sellPercent === p && styles.quickBtnActiveSell]}
                            onPress={() => { setSellPercent(p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                          >
                            <Text style={[styles.quickBtnText, sellPercent === p && styles.quickBtnTextActive]}>{p}%</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.executeBtn, styles.sellBtn, executing && styles.disabledBtn]}
                        onPress={executeSell}
                        disabled={executing}
                      >
                        {executing ? (
                          <ActivityIndicator color={colors.white} />
                        ) : (
                          <Text style={styles.executeBtnText}>SELL {sellPercent}%</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.noPosition}>
                      <Text style={styles.noPositionText}>No open position for this token</Text>
                      <Text style={styles.noPositionSub}>Buy first to open a position</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Empty State */}
          {!tokenAddress && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Search for a token</Text>
              <Text style={styles.emptySub}>Paste a contract address or search by name to start trading</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  scroll: { flex: 1 },

  // Search
  searchContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, position: 'relative' },
  searchInput: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border1,
    borderRadius: 4, padding: spacing.md, fontFamily: 'CourierPrime', fontSize: 14, color: colors.t0,
  },
  searchSpinner: { position: 'absolute', right: 28, top: 24 },
  searchResults: {
    marginHorizontal: spacing.lg, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border1, borderRadius: 4, marginTop: 2,
  },
  searchResultItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border0,
  },
  searchResultName: { fontFamily: 'CourierPrime-Bold', fontSize: 14, color: colors.t0 },
  searchResultMcap: { fontFamily: 'CourierPrime', fontSize: 12, color: colors.t2 },

  // Token Info
  tokenInfo: {
    margin: spacing.lg, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border1, borderRadius: 4, padding: spacing.lg,
  },
  tokenHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: spacing.md },
  tokenSymbol: { fontFamily: 'SpecialElite', fontSize: 22, color: colors.t0 },
  tokenName: { fontFamily: 'CourierPrime', fontSize: 13, color: colors.t2 },
  tokenStats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statLabel: { fontFamily: 'CourierPrime', fontSize: 10, color: colors.t3, letterSpacing: 1, marginBottom: 2 },
  statValue: { fontFamily: 'CourierPrime-Bold', fontSize: 13, color: colors.t0 },

  // Chart
  chartContainer: {
    marginHorizontal: spacing.lg, height: 300,
    borderWidth: 1, borderColor: colors.border1, borderRadius: 4, overflow: 'hidden',
  },
  chart: { flex: 1, backgroundColor: '#1a1a2e' },

  // Trade Panel
  tradePanel: {
    margin: spacing.lg, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border1, borderRadius: 4, overflow: 'hidden',
  },
  tradeTabs: { flexDirection: 'row' },
  tradeTab: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    backgroundColor: colors.bg2, borderBottomWidth: 2, borderBottomColor: colors.border1,
  },
  tradeTabActive: { backgroundColor: colors.greenBg, borderBottomColor: colors.green },
  tradeTabActiveSell: { backgroundColor: colors.redBg, borderBottomColor: colors.red },
  tradeTabText: { fontFamily: 'SpecialElite', fontSize: 14, color: colors.t2 },
  tradeTabTextActive: { color: colors.t0 },

  tradeBody: { padding: spacing.lg },
  balanceText: { fontFamily: 'CourierPrime', fontSize: 12, color: colors.t2, marginBottom: spacing.md },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  quickBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border1, borderRadius: 3,
  },
  quickBtnActive: { backgroundColor: colors.greenBg, borderColor: colors.green },
  quickBtnActiveSell: { backgroundColor: colors.redBg, borderColor: colors.red },
  quickBtnText: { fontFamily: 'CourierPrime-Bold', fontSize: 13, color: colors.t1 },
  quickBtnTextActive: { color: colors.t0 },

  amountInput: {
    backgroundColor: colors.bg1, borderWidth: 1, borderColor: colors.border1,
    borderRadius: 3, padding: spacing.md, fontFamily: 'CourierPrime', fontSize: 14,
    color: colors.t0, marginBottom: spacing.md,
  },

  executeBtn: {
    paddingVertical: 14, alignItems: 'center', borderRadius: 4,
  },
  buyBtn: { backgroundColor: colors.green },
  sellBtn: { backgroundColor: colors.red },
  disabledBtn: { opacity: 0.5 },
  executeBtnText: { fontFamily: 'SpecialElite', fontSize: 16, color: colors.white, letterSpacing: 1 },

  // Position
  positionInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  positionLabel: { fontFamily: 'CourierPrime', fontSize: 13, color: colors.t2 },
  positionPnl: { fontFamily: 'CourierPrime-Bold', fontSize: 18 },

  noPosition: { alignItems: 'center', paddingVertical: spacing.xl },
  noPositionText: { fontFamily: 'CourierPrime-Bold', fontSize: 14, color: colors.t2 },
  noPositionSub: { fontFamily: 'CourierPrime', fontSize: 12, color: colors.t3, marginTop: 4 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontFamily: 'SpecialElite', fontSize: 20, color: colors.t1, marginBottom: spacing.sm },
  emptySub: { fontFamily: 'CourierPrime', fontSize: 14, color: colors.t3, textAlign: 'center' },
});

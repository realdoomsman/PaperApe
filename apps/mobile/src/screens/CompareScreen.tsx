import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { colors, spacing } from '../theme';

export default function CompareScreen() {
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [token1, setToken1] = useState<any>(null);
  const [token2, setToken2] = useState<any>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const loadToken = async (address: string, setToken: (d: any) => void, setLoading: (b: boolean) => void) => {
    if (address.length < 30) return;
    setLoading(true);
    const res = await apiRequest('GET', `/tokens/${address}`);
    if (res.success && res.data) setToken(res.data);
    setLoading(false);
  };

  useEffect(() => { loadToken(address1, setToken1, setLoading1); }, [address1]);
  useEffect(() => { loadToken(address2, setToken2, setLoading2); }, [address2]);

  const formatMcap = (val: number) => {
    if (!val) return '-';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const compareRow = (label: string, val1: string, val2: string) => (
    <View style={styles.compareRow} key={label}>
      <Text style={styles.compareVal}>{val1}</Text>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareVal}>{val2}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>COMPARE TOKENS</Text>

        <View style={styles.inputs}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>TOKEN 1</Text>
            <TextInput
              style={styles.input}
              value={address1}
              onChangeText={setAddress1}
              placeholder="Paste address..."
              placeholderTextColor={colors.t3}
              autoCapitalize="none"
            />
            {loading1 && <ActivityIndicator size="small" color={colors.green} />}
            {token1 && <Text style={styles.tokenName}>{token1.symbol}</Text>}
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>TOKEN 2</Text>
            <TextInput
              style={styles.input}
              value={address2}
              onChangeText={setAddress2}
              placeholder="Paste address..."
              placeholderTextColor={colors.t3}
              autoCapitalize="none"
            />
            {loading2 && <ActivityIndicator size="small" color={colors.green} />}
            {token2 && <Text style={styles.tokenName}>{token2.symbol}</Text>}
          </View>
        </View>

        {token1 && token2 && (
          <View style={styles.comparison}>
            <View style={styles.headerRow}>
              <Text style={styles.headerToken}>{token1.symbol}</Text>
              <Text style={styles.headerVs}>VS</Text>
              <Text style={styles.headerToken}>{token2.symbol}</Text>
            </View>
            {compareRow('PRICE', `$${token1.price_usd?.toFixed(8) || '-'}`, `$${token2.price_usd?.toFixed(8) || '-'}`)}
            {compareRow('MCAP', formatMcap(token1.market_cap || token1.mcap), formatMcap(token2.market_cap || token2.mcap))}
            {compareRow('VOLUME', formatMcap(token1.volume_24h || token1.volume), formatMcap(token2.volume_24h || token2.volume))}
            {compareRow('LIQUIDITY', formatMcap(token1.liquidity_usd || token1.liquidity), formatMcap(token2.liquidity_usd || token2.liquidity))}
            {compareRow('24H', `${(token1.price_change_24h || 0).toFixed(1)}%`, `${(token2.price_change_24h || 0).toFixed(1)}%`)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  scroll: { flex: 1, padding: spacing.lg },
  title: { fontFamily: 'SpecialElite', fontSize: 22, color: colors.t0, marginBottom: spacing.lg },
  inputs: { flexDirection: 'row', gap: spacing.md },
  inputWrap: { flex: 1 },
  label: { fontFamily: 'CourierPrime', fontSize: 11, color: colors.t3, letterSpacing: 1, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border1,
    borderRadius: 3, padding: spacing.sm, fontFamily: 'CourierPrime', fontSize: 11, color: colors.t0,
  },
  tokenName: { fontFamily: 'CourierPrime-Bold', fontSize: 14, color: colors.green, marginTop: 4 },
  comparison: {
    marginTop: spacing.xl, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border1, borderRadius: 4, padding: spacing.lg,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerToken: { fontFamily: 'SpecialElite', fontSize: 18, color: colors.t0 },
  headerVs: { fontFamily: 'SpecialElite', fontSize: 14, color: colors.t3 },
  compareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border0,
  },
  compareLabel: { fontFamily: 'CourierPrime', fontSize: 11, color: colors.t3, letterSpacing: 1 },
  compareVal: { fontFamily: 'CourierPrime-Bold', fontSize: 13, color: colors.t0, width: 100, textAlign: 'center' },
});

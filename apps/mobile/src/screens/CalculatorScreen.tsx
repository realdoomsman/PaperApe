import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export default function CalculatorScreen() {
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');

  const entry = parseFloat(entryPrice) || 0;
  const exit = parseFloat(exitPrice) || 0;
  const size = parseFloat(positionSize) || 0;

  const pnlPercent = entry > 0 ? ((exit - entry) / entry) * 100 : 0;
  const pnlValue = entry > 0 ? (size * (exit - entry)) / entry : 0;
  const riskReward = entry > 0 && exit > entry ? (exit - entry) / entry : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>POSITION CALCULATOR</Text>
        <Text style={styles.subtitle}>Calculate risk, reward, and position sizing</Text>

        <View style={styles.card}>
          <Text style={styles.label}>ENTRY PRICE (USD)</Text>
          <TextInput
            style={styles.input}
            value={entryPrice}
            onChangeText={setEntryPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.t3}
          />

          <Text style={styles.label}>EXIT PRICE (USD)</Text>
          <TextInput
            style={styles.input}
            value={exitPrice}
            onChangeText={setExitPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.t3}
          />

          <Text style={styles.label}>POSITION SIZE (SOL)</Text>
          <TextInput
            style={styles.input}
            value={positionSize}
            onChangeText={setPositionSize}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.t3}
          />
        </View>

        {entry > 0 && exit > 0 && (
          <View style={styles.results}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>PnL %</Text>
              <Text style={[styles.resultValue, { color: pnlPercent >= 0 ? colors.green : colors.red }]}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>PnL (SOL)</Text>
              <Text style={[styles.resultValue, { color: pnlValue >= 0 ? colors.green : colors.red }]}>
                {pnlValue >= 0 ? '+' : ''}{pnlValue.toFixed(4)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>R:R Ratio</Text>
              <Text style={styles.resultValue}>{riskReward.toFixed(2)}x</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  scroll: { flex: 1, padding: spacing.lg },
  title: { fontFamily: 'SpecialElite', fontSize: 22, color: colors.t0, marginBottom: 4 },
  subtitle: { fontFamily: 'CourierPrime', fontSize: 13, color: colors.t2, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border1,
    borderRadius: 4, padding: spacing.lg,
  },
  label: { fontFamily: 'CourierPrime', fontSize: 11, color: colors.t3, letterSpacing: 1, marginBottom: 4, marginTop: spacing.md },
  input: {
    backgroundColor: colors.bg1, borderWidth: 1, borderColor: colors.border1,
    borderRadius: 3, padding: spacing.md, fontFamily: 'CourierPrime', fontSize: 16, color: colors.t0,
  },
  results: {
    marginTop: spacing.lg, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border1, borderRadius: 4, padding: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border0,
  },
  resultLabel: { fontFamily: 'CourierPrime', fontSize: 13, color: colors.t2 },
  resultValue: { fontFamily: 'CourierPrime-Bold', fontSize: 16, color: colors.t0 },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { apiRequest } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

const MAX_WALLETS = 5;

interface Wallet {
  id: string;
  name: string;
  address: string;
  balance: number;
  pnl: number;
  pnl_percent: number;
  is_primary: boolean;
  created_at: string;
}

export default function WalletsScreen() {
  const { token } = useAuth();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create wallet
  const [creating, setCreating] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string>('');
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);

  const fetchWallets = useCallback(async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<Wallet[]>('GET', '/wallets', undefined, token);
      if (res.success && res.data) {
        setWallets(res.data);
      } else {
        setError(res.error || 'Failed to load wallets');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWallets();
  }, [fetchWallets]);

  const handleCreateWallet = useCallback(async () => {
    if (!token || !newWalletName.trim()) return;
    setCreating(true);
    try {
      const res = await apiRequest('POST', '/wallets', { name: newWalletName.trim() }, token);
      if (res.success) {
        setNewWalletName('');
        setShowCreateModal(false);
        fetchWallets();
      } else {
        Alert.alert('Error', res.error || 'Failed to create wallet');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }, [token, newWalletName, fetchWallets]);

  const handleSetPrimary = useCallback(async (walletId: string) => {
    if (!token) return;
    try {
      const res = await apiRequest('POST', `/wallets/${walletId}/set-primary`, undefined, token);
      if (res.success) {
        fetchWallets(true);
      } else {
        Alert.alert('Error', res.error || 'Failed to set primary wallet');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  }, [token, fetchWallets]);

  const handleResetBalance = useCallback(async (walletId: string) => {
    if (!token) return;
    Alert.alert(
      'Reset Balance',
      'Are you sure? This will reset this wallet\'s balance to the default amount.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiRequest('POST', `/wallets/${walletId}/reset`, undefined, token);
              if (res.success) {
                fetchWallets(true);
              } else {
                Alert.alert('Error', res.error || 'Failed to reset balance');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Something went wrong');
            }
          },
        },
      ],
    );
  }, [token, fetchWallets]);

  const handleTransfer = useCallback(async () => {
    if (!token || !transferFrom || !transferTo || !transferAmount) return;
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (transferFrom === transferTo) {
      Alert.alert('Error', 'Cannot transfer to the same wallet');
      return;
    }

    setTransferring(true);
    try {
      const res = await apiRequest('POST', '/wallets/transfer', {
        from_wallet_id: transferFrom,
        to_wallet_id: transferTo,
        amount,
      }, token);
      if (res.success) {
        setShowTransferModal(false);
        setTransferAmount('');
        setTransferFrom('');
        setTransferTo('');
        fetchWallets(true);
      } else {
        Alert.alert('Error', res.error || 'Transfer failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setTransferring(false);
    }
  }, [token, transferFrom, transferTo, transferAmount, fetchWallets]);

  const formatBalance = (value: number) => `${value.toFixed(4)} SOL`;

  const renderWalletCard = useCallback(({ item }: { item: Wallet }) => {
    const pnlColor = item.pnl >= 0 ? colors.green : colors.red;
    const pnlSign = item.pnl >= 0 ? '+' : '';

    return (
      <TouchableOpacity
        style={[styles.walletCard, item.is_primary && styles.walletCardPrimary]}
        onPress={() => handleSetPrimary(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.walletHeader}>
          <View style={styles.walletNameRow}>
            <Text style={styles.walletName}>{item.name}</Text>
            {item.is_primary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>PRIMARY</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => handleResetBalance(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.walletBody}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>{formatBalance(item.balance)}</Text>
          </View>
          <View style={styles.pnlSection}>
            <Text style={styles.pnlLabel}>PnL</Text>
            <Text style={[styles.pnlValue, { color: pnlColor }]}>
              {pnlSign}{item.pnl.toFixed(4)} SOL
            </Text>
            <Text style={[styles.pnlPercent, { color: pnlColor }]}>
              ({pnlSign}{item.pnl_percent.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <Text style={styles.walletAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </TouchableOpacity>
    );
  }, [handleSetPrimary, handleResetBalance]);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.headerTitle}>💰 Wallets</Text>
      <Text style={styles.headerSubtitle}>
        {wallets.length}/{MAX_WALLETS} wallets • Tap to set primary
      </Text>

      <View style={styles.actionRow}>
        {wallets.length < MAX_WALLETS && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.actionBtnText}>+ New Wallet</Text>
          </TouchableOpacity>
        )}
        {wallets.length >= 2 && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => {
              setTransferFrom(wallets[0]?.id || '');
              setTransferTo(wallets[1]?.id || '');
              setShowTransferModal(true);
            }}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>⇄ Transfer SOL</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading wallets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWallets()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={item => item.id}
          renderItem={renderWalletCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No wallets yet</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.actionBtnText}>Create Your First Wallet</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Create Wallet Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Wallet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Wallet name..."
              placeholderTextColor={colors.t3}
              value={newWalletName}
              onChangeText={setNewWalletName}
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCreateModal(false); setNewWalletName(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!newWalletName.trim() || creating) && styles.modalBtnDisabled]}
                onPress={handleCreateWallet}
                disabled={!newWalletName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transfer SOL</Text>

            <Text style={styles.fieldLabel}>From</Text>
            <View style={styles.pickerRow}>
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.pickerOption, transferFrom === w.id && styles.pickerOptionActive]}
                  onPress={() => setTransferFrom(w.id)}
                >
                  <Text style={[styles.pickerText, transferFrom === w.id && styles.pickerTextActive]} numberOfLines={1}>
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>To</Text>
            <View style={styles.pickerRow}>
              {wallets.filter(w => w.id !== transferFrom).map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.pickerOption, transferTo === w.id && styles.pickerOptionActive]}
                  onPress={() => setTransferTo(w.id)}
                >
                  <Text style={[styles.pickerText, transferTo === w.id && styles.pickerTextActive]} numberOfLines={1}>
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Amount (SOL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0.0000"
              placeholderTextColor={colors.t3}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowTransferModal(false); setTransferAmount(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, transferring && styles.modalBtnDisabled]}
                onPress={handleTransfer}
                disabled={transferring}
              >
                {transferring ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
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
  retryBtnText: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.green,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionBtnText: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  actionBtnTextSecondary: {
    color: colors.accent,
  },
  walletCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  walletCardPrimary: {
    borderColor: colors.green,
    borderWidth: 1.5,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walletName: {
    ...typography.heading,
    fontSize: 16,
    color: colors.t0,
  },
  primaryBadge: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  primaryText: {
    ...typography.bodyBold,
    fontSize: 9,
    color: colors.white,
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resetBtnText: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
  },
  walletBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  balanceSection: {},
  balanceLabel: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
    marginBottom: 2,
  },
  balanceValue: {
    ...typography.bodyBold,
    fontSize: 18,
    color: colors.t0,
  },
  pnlSection: {
    alignItems: 'flex-end',
  },
  pnlLabel: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
    marginBottom: 2,
  },
  pnlValue: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  pnlPercent: {
    ...typography.body,
    fontSize: 12,
    marginTop: 1,
  },
  walletAddress: {
    ...typography.mono,
    fontSize: 10,
    color: colors.t3,
    backgroundColor: colors.bg1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    overflow: 'hidden',
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
    marginBottom: spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    ...shadows.paper,
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 20,
    color: colors.t0,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.t0,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.bodyBold,
    fontSize: 12,
    color: colors.t2,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border0,
  },
  pickerOptionActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  pickerText: {
    ...typography.body,
    fontSize: 12,
    color: colors.t2,
  },
  pickerTextActive: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  modalCancelText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.green,
  },
  modalConfirmText: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
});

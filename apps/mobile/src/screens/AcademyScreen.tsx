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
import { useAuth } from '../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface Lesson {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  reward_sol: number;
  order: number;
}

const LESSONS: Lesson[] = [
  // Trench Fundamentals
  { id: 'lesson-1', title: 'What Are Memecoins?', category: 'Trench Fundamentals', difficulty: 'Beginner', reward_sol: 0.5, order: 1 },
  { id: 'lesson-2', title: 'How Bonding Curves Work', category: 'Trench Fundamentals', difficulty: 'Beginner', reward_sol: 0.5, order: 2 },
  { id: 'lesson-3', title: 'Reading a Token Chart', category: 'Trench Fundamentals', difficulty: 'Beginner', reward_sol: 0.5, order: 3 },
  { id: 'lesson-4', title: 'Honeypot Detection', category: 'Trench Fundamentals', difficulty: 'Intermediate', reward_sol: 1.0, order: 4 },
  { id: 'lesson-5', title: 'Rug Pull Red Flags', category: 'Trench Fundamentals', difficulty: 'Intermediate', reward_sol: 1.0, order: 5 },
  { id: 'lesson-6', title: 'Understanding Liquidity', category: 'Trench Fundamentals', difficulty: 'Beginner', reward_sol: 0.5, order: 6 },
  // On-Chain Analysis
  { id: 'lesson-7', title: 'Sandwich Attacks Explained', category: 'On-Chain Analysis', difficulty: 'Intermediate', reward_sol: 1.0, order: 7 },
  { id: 'lesson-8', title: 'Fake Volume Patterns', category: 'On-Chain Analysis', difficulty: 'Intermediate', reward_sol: 1.0, order: 8 },
  { id: 'lesson-9', title: 'Smart Money Tracking', category: 'On-Chain Analysis', difficulty: 'Advanced', reward_sol: 2.0, order: 9 },
  { id: 'lesson-10', title: 'Reading On-Chain Data', category: 'On-Chain Analysis', difficulty: 'Intermediate', reward_sol: 1.0, order: 10 },
  { id: 'lesson-11', title: 'Wallet Clustering Analysis', category: 'On-Chain Analysis', difficulty: 'Advanced', reward_sol: 2.0, order: 11 },
  // Thesis & Conviction
  { id: 'lesson-12', title: 'Entry & Exit Strategy', category: 'Thesis & Conviction', difficulty: 'Intermediate', reward_sol: 1.0, order: 12 },
  { id: 'lesson-13', title: 'Risk Management 101', category: 'Thesis & Conviction', difficulty: 'Beginner', reward_sol: 0.5, order: 13 },
  { id: 'lesson-14', title: 'Moon Bag Strategy', category: 'Thesis & Conviction', difficulty: 'Intermediate', reward_sol: 1.0, order: 14 },
  { id: 'lesson-15', title: 'DCA Fundamentals', category: 'Thesis & Conviction', difficulty: 'Beginner', reward_sol: 0.5, order: 15 },
  { id: 'lesson-16', title: 'Building a Trading Thesis', category: 'Thesis & Conviction', difficulty: 'Advanced', reward_sol: 2.0, order: 16 },
  { id: 'lesson-17', title: 'Position Sizing Mastery', category: 'Thesis & Conviction', difficulty: 'Advanced', reward_sol: 2.0, order: 17 },
];

const TOTAL_LESSONS = 50;

const CATEGORIES = ['Trench Fundamentals', 'On-Chain Analysis', 'Thesis & Conviction'];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner: colors.green,
  Intermediate: colors.gold,
  Advanced: colors.red,
};

export default function AcademyScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<any>();

  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchProgress = useCallback(async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<{ completed_lessons: string[] }>('GET', '/academy/progress', undefined, token);
      if (res.success && res.data) {
        setCompletedLessons(res.data.completed_lessons || []);
      } else {
        setError(res.error || 'Failed to load progress');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgress();
  }, [fetchProgress]);

  const completedCount = completedLessons.length;
  const progressPercent = (completedCount / TOTAL_LESSONS) * 100;

  const filteredLessons = selectedCategory
    ? LESSONS.filter(l => l.category === selectedCategory)
    : LESSONS;

  const handleLessonPress = useCallback((lesson: Lesson) => {
    navigation.navigate('LessonDetail', {
      lessonId: lesson.id,
      title: lesson.title,
    });
  }, [navigation]);

  const renderLessonCard = useCallback(({ item }: { item: Lesson }) => {
    const isCompleted = completedLessons.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.lessonCard, isCompleted && styles.lessonCardCompleted]}
        onPress={() => handleLessonPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.lessonHeader}>
          <View style={styles.lessonTitleRow}>
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            <Text style={[styles.lessonTitle, isCompleted && styles.lessonTitleCompleted]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] + '20' }]}>
            <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>
              {item.difficulty}
            </Text>
          </View>
        </View>
        <View style={styles.lessonFooter}>
          <Text style={styles.lessonCategory}>{item.category}</Text>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>🪙 {item.reward_sol.toFixed(1)} SOL</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [completedLessons, handleLessonPress]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading Academy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredLessons}
        keyExtractor={item => item.id}
        renderItem={renderLessonCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Progress Section */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>📚 Academy Progress</Text>
                <Text style={styles.progressCount}>{completedCount}/{TOTAL_LESSONS}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{progressPercent.toFixed(0)}% Complete</Text>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => fetchProgress()}>
                  <Text style={styles.retryLink}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Category Filter */}
            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]} numberOfLines={1}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No lessons in this category</Text>}
      />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border1,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.t0,
  },
  progressCount: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.green,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: colors.bg2,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: colors.green,
    borderRadius: radii.full,
  },
  progressPercent: {
    ...typography.body,
    fontSize: 12,
    color: colors.t3,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.redBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.red,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    fontSize: 13,
    color: colors.red,
    flex: 1,
  },
  retryLink: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.red,
    marginLeft: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border0,
  },
  categoryChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  categoryChipText: {
    ...typography.body,
    fontSize: 11,
    color: colors.t2,
  },
  categoryChipTextActive: {
    color: colors.white,
    ...typography.bodyBold,
    fontSize: 11,
  },
  lessonCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  lessonCardCompleted: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  checkmark: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.green,
    marginRight: spacing.sm,
  },
  lessonTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.t0,
    flex: 1,
  },
  lessonTitleCompleted: {
    color: colors.green,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  difficultyText: {
    ...typography.body,
    fontSize: 10,
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonCategory: {
    ...typography.body,
    fontSize: 11,
    color: colors.t3,
  },
  rewardBadge: {
    backgroundColor: colors.goldBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  rewardText: {
    ...typography.body,
    fontSize: 11,
    color: colors.gold,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});

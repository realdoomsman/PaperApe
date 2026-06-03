import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { apiRequest } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { useRoute, useNavigation } from '@react-navigation/native';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface LessonContent {
  title: string;
  sections: { heading: string; body: string }[];
  quiz: QuizQuestion[];
  reward_sol: number;
}

// Hardcoded lesson content by ID
const LESSON_DATA: Record<string, LessonContent> = {
  'lesson-1': {
    title: 'What Are Memecoins?',
    reward_sol: 0.5,
    sections: [
      {
        heading: 'Introduction',
        body: 'Memecoins are cryptocurrency tokens inspired by internet memes, jokes, or cultural phenomena. Unlike traditional cryptocurrencies like Bitcoin or Ethereum, memecoins typically lack fundamental technology or utility beyond community engagement and speculation.',
      },
      {
        heading: 'Why Do They Exist?',
        body: 'Memecoins thrive on community sentiment, viral marketing, and speculative trading. They often see massive price swings driven by social media hype, influencer endorsements, and FOMO (Fear Of Missing Out). The Solana ecosystem has become a hotspot for memecoin activity due to low transaction fees and fast confirmation times.',
      },
      {
        heading: 'Key Characteristics',
        body: '• Usually have extremely large or unlimited supply\n• Price driven by community hype rather than fundamentals\n• Often launched on bonding curves (like pump.fun)\n• Can migrate to DEXs like Raydium once they "graduate"\n• Extremely volatile — can 100x or go to zero rapidly',
      },
    ],
    quiz: [
      {
        question: 'What primarily drives memecoin prices?',
        options: ['Advanced technology', 'Community hype and speculation', 'Government regulation', 'Mining difficulty'],
        correctIndex: 1,
      },
      {
        question: 'Where are Solana memecoins commonly launched?',
        options: ['Ethereum mainnet', 'Bitcoin Lightning Network', 'Bonding curves like pump.fun', 'Centralized exchanges'],
        correctIndex: 2,
      },
    ],
  },
  'lesson-2': {
    title: 'How Bonding Curves Work',
    reward_sol: 0.5,
    sections: [
      {
        heading: 'What is a Bonding Curve?',
        body: 'A bonding curve is a mathematical formula that determines the price of a token based on its supply. As more tokens are purchased, the price increases along the curve. When tokens are sold, the price decreases. This creates an automated market maker without needing a traditional order book.',
      },
      {
        heading: 'How pump.fun Uses Them',
        body: 'On pump.fun, new tokens start at a very low price. Early buyers get tokens cheaply, and as demand increases, subsequent buyers pay more. Once the bonding curve reaches a certain market cap threshold (typically ~$69K), the token "graduates" and migrates liquidity to Raydium.',
      },
      {
        heading: 'Risks and Opportunities',
        body: '• Early entry means cheaper tokens but higher risk of the project failing\n• Late entry means the token has more traction but less upside\n• The curve ensures there is always liquidity for buying/selling\n• Rug risk exists if the deployer dumps their tokens early',
      },
    ],
    quiz: [
      {
        question: 'What happens to the price as more tokens are bought on a bonding curve?',
        options: ['Price decreases', 'Price stays the same', 'Price increases', 'Price becomes random'],
        correctIndex: 2,
      },
      {
        question: 'What happens when a pump.fun token "graduates"?',
        options: ['It gets delisted', 'Liquidity migrates to Raydium', 'The price resets to zero', 'It becomes a stablecoin'],
        correctIndex: 1,
      },
    ],
  },
  'lesson-3': {
    title: 'Reading a Token Chart',
    reward_sol: 0.5,
    sections: [
      {
        heading: 'Chart Basics',
        body: 'Token charts display price action over time. The most common chart types are line charts and candlestick charts. Candlestick charts show four data points for each period: open, high, low, and close (OHLC). Green candles indicate the price closed higher than it opened; red candles indicate the opposite.',
      },
      {
        heading: 'Volume',
        body: 'Volume bars at the bottom of a chart show how much trading activity occurred during each period. High volume during price increases suggests strong buying pressure. High volume during price decreases suggests strong selling pressure. Low volume moves are less reliable.',
      },
      {
        heading: 'Support and Resistance',
        body: 'Support levels are price points where a token tends to stop falling and bounce back up. Resistance levels are where the price tends to stop rising. These are formed by historical buying and selling activity. Breaking through resistance often signals a potential rally; breaking support may signal further decline.',
      },
    ],
    quiz: [
      {
        question: 'What does a green candlestick indicate?',
        options: ['Price closed lower than it opened', 'Price closed higher than it opened', 'No trading occurred', 'The token was delisted'],
        correctIndex: 1,
      },
      {
        question: 'What does high volume during a price increase suggest?',
        options: ['Weak interest', 'Strong selling pressure', 'Strong buying pressure', 'Market manipulation'],
        correctIndex: 2,
      },
    ],
  },
  'lesson-4': {
    title: 'Honeypot Detection',
    reward_sol: 1.0,
    sections: [
      {
        heading: 'What is a Honeypot?',
        body: 'A honeypot token is designed to lure buyers in but prevent them from selling. The smart contract is coded so that while anyone can buy, selling is restricted — either completely blocked, taxed at 99%, or only allowed for the deployer. You can buy in, but you can never get your money out.',
      },
      {
        heading: 'Red Flags',
        body: '• Unusual sell tax (>10%)\n• No successful sell transactions in the history\n• Modified transfer functions in the contract\n• Locked or hidden ownership functions\n• Contract not verified on the explorer\n• Deployer wallet with a history of honeypot deployments',
      },
      {
        heading: 'How to Check',
        body: 'Before buying any token, check the contract on a honeypot detector tool. Look at recent transactions — if nobody has been able to sell, that\'s a major red flag. Check if the contract source code is verified and readable. Use tools like RugCheck or BirdEye to analyze the token\'s safety score.',
      },
    ],
    quiz: [
      {
        question: 'What is a honeypot in crypto?',
        options: ['A high-yield farming protocol', 'A token that prevents selling', 'A decentralized exchange', 'A type of wallet'],
        correctIndex: 1,
      },
      {
        question: 'Which is a red flag for honeypots?',
        options: ['High trading volume', 'No successful sell transactions', 'Many holders', 'Low market cap'],
        correctIndex: 1,
      },
    ],
  },
  'lesson-5': {
    title: 'Rug Pull Red Flags',
    reward_sol: 1.0,
    sections: [
      {
        heading: 'What is a Rug Pull?',
        body: 'A rug pull occurs when token creators suddenly remove liquidity or dump their holdings, causing the price to crash to near zero. This leaves other investors holding worthless tokens. Rug pulls are one of the most common scams in the memecoin space.',
      },
      {
        heading: 'Warning Signs',
        body: '• Deployer holds a large percentage of supply (>10%)\n• Liquidity is not locked or burned\n• Anonymous team with no track record\n• Unrealistic promises of returns\n• Aggressive marketing with no substance\n• Copy-paste contract code\n• Multiple wallets linked to known rug pullers',
      },
      {
        heading: 'Protection Strategies',
        body: 'Always check if liquidity is locked. Look at the deployer\'s wallet history. Check the token distribution — if a few wallets hold most of the supply, proceed with extreme caution. Never invest more than you can afford to lose, and take profits along the way.',
      },
    ],
    quiz: [
      {
        question: 'What happens in a rug pull?',
        options: ['Token gets listed on Coinbase', 'Creators remove liquidity or dump holdings', 'Price goes up 100x', 'New features are added'],
        correctIndex: 1,
      },
      {
        question: 'What should you check before buying a memecoin?',
        options: ['If the website looks nice', 'If liquidity is locked', 'How many Twitter followers they have', 'If the logo is original'],
        correctIndex: 1,
      },
    ],
  },
};

// Fallback for lessons without hardcoded content
const DEFAULT_LESSON: LessonContent = {
  title: 'Lesson',
  reward_sol: 0.5,
  sections: [
    {
      heading: 'Coming Soon',
      body: 'This lesson content is being prepared. Check back soon for the full material and quiz.',
    },
  ],
  quiz: [
    {
      question: 'Are you ready to learn more about trading?',
      options: ['Yes!', 'No', 'Maybe later', 'I already know everything'],
      correctIndex: 0,
    },
  ],
};

export default function LessonDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { token } = useAuth();

  const lessonId: string = route.params?.lessonId || '';
  const lessonTitle: string = route.params?.title || 'Lesson';

  const lesson = useMemo(() => LESSON_DATA[lessonId] || { ...DEFAULT_LESSON, title: lessonTitle }, [lessonId, lessonTitle]);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const totalQuestions = lesson.quiz.length;
  const correctCount = lesson.quiz.filter((q, i) => answers[i] === q.correctIndex).length;
  const allAnswered = Object.keys(answers).length === totalQuestions;
  const passed = submitted && correctCount === totalQuestions;

  const handleSelectAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  }, [submitted]);

  const handleSubmitQuiz = useCallback(() => {
    if (!allAnswered) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }
    setSubmitted(true);
  }, [allAnswered]);

  const handleRetryQuiz = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
  }, []);

  const handleClaimReward = useCallback(async () => {
    if (!token) {
      Alert.alert('Error', 'You must be signed in to claim rewards.');
      return;
    }
    setClaiming(true);
    try {
      const res = await apiRequest('POST', '/academy/claim-reward', { lesson_id: lessonId }, token);
      if (res.success) {
        setClaimed(true);
        Alert.alert('🎉 Reward Claimed!', `You earned ${lesson.reward_sol.toFixed(1)} SOL!`);
      } else {
        Alert.alert('Error', res.error || 'Failed to claim reward');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setClaiming(false);
    }
  }, [token, lessonId, lesson.reward_sol]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Lesson Header */}
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>🪙 {lesson.reward_sol.toFixed(1)} SOL Reward</Text>
          </View>
        </View>

        {/* Content Sections */}
        {lesson.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Quiz Section */}
        <View style={styles.quizSection}>
          <View style={styles.quizHeader}>
            <Text style={styles.quizTitle}>📝 Quiz</Text>
            <Text style={styles.quizSubtitle}>
              Answer all questions correctly to complete this lesson
            </Text>
          </View>

          {lesson.quiz.map((q, qIndex) => {
            const selectedAnswer = answers[qIndex];
            const isAnswered = selectedAnswer !== undefined;

            return (
              <View key={qIndex} style={styles.questionCard}>
                <Text style={styles.questionNumber}>Question {qIndex + 1}</Text>
                <Text style={styles.questionText}>{q.question}</Text>

                {q.options.map((option, oIndex) => {
                  const isSelected = selectedAnswer === oIndex;
                  const isCorrect = submitted && oIndex === q.correctIndex;
                  const isWrong = submitted && isSelected && oIndex !== q.correctIndex;

                  let optionStyle = styles.option;
                  let textStyle = styles.optionText;

                  if (isCorrect) {
                    optionStyle = { ...styles.option, ...styles.optionCorrect };
                    textStyle = { ...styles.optionText, ...styles.optionTextCorrect };
                  } else if (isWrong) {
                    optionStyle = { ...styles.option, ...styles.optionWrong };
                    textStyle = { ...styles.optionText, ...styles.optionTextWrong };
                  } else if (isSelected && !submitted) {
                    optionStyle = { ...styles.option, ...styles.optionSelected };
                    textStyle = { ...styles.optionText, ...styles.optionTextSelected };
                  }

                  return (
                    <TouchableOpacity
                      key={oIndex}
                      style={optionStyle}
                      onPress={() => handleSelectAnswer(qIndex, oIndex)}
                      disabled={submitted}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionLetter}>
                        {String.fromCharCode(65 + oIndex)}.
                      </Text>
                      <Text style={textStyle}>{option}</Text>
                      {isCorrect && <Text style={styles.feedbackIcon}>✓</Text>}
                      {isWrong && <Text style={styles.feedbackIcon}>✕</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {/* Quiz Actions */}
          {!submitted ? (
            <TouchableOpacity
              style={[styles.submitBtn, !allAnswered && styles.submitBtnDisabled]}
              onPress={handleSubmitQuiz}
              disabled={!allAnswered}
            >
              <Text style={styles.submitBtnText}>Submit Answers</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resultSection}>
              <View style={[styles.resultCard, passed ? styles.resultCardPass : styles.resultCardFail]}>
                <Text style={styles.resultEmoji}>{passed ? '🎉' : '😔'}</Text>
                <Text style={[styles.resultTitle, { color: passed ? colors.green : colors.red }]}>
                  {passed ? 'Quiz Passed!' : 'Not Quite...'}
                </Text>
                <Text style={styles.resultScore}>
                  {correctCount}/{totalQuestions} Correct
                </Text>
              </View>

              {passed ? (
                <TouchableOpacity
                  style={[styles.claimBtn, (claiming || claimed) && styles.claimBtnDisabled]}
                  onPress={handleClaimReward}
                  disabled={claiming || claimed}
                >
                  {claiming ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.claimBtnText}>
                      {claimed ? '✓ Reward Claimed' : `🪙 Claim ${lesson.reward_sol.toFixed(1)} SOL Reward`}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetryQuiz}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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
    paddingBottom: spacing.xxxl * 2,
  },
  lessonHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  lessonTitle: {
    ...typography.heading,
    fontSize: 24,
    color: colors.t0,
    marginBottom: spacing.sm,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  rewardText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.gold,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionHeading: {
    ...typography.heading,
    fontSize: 16,
    color: colors.t0,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    ...typography.body,
    fontSize: 14,
    color: colors.t1,
    lineHeight: 22,
  },
  quizSection: {
    marginTop: spacing.lg,
  },
  quizHeader: {
    marginBottom: spacing.lg,
  },
  quizTitle: {
    ...typography.heading,
    fontSize: 20,
    color: colors.t0,
    marginBottom: spacing.xs,
  },
  quizSubtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.t3,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  questionNumber: {
    ...typography.bodyBold,
    fontSize: 11,
    color: colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  questionText: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.t0,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  optionCorrect: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
  },
  optionWrong: {
    borderColor: colors.red,
    backgroundColor: colors.redBg,
  },
  optionLetter: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.t2,
    marginRight: spacing.sm,
    width: 24,
  },
  optionText: {
    ...typography.body,
    fontSize: 13,
    color: colors.t1,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.accent,
    ...typography.bodyBold,
    fontSize: 13,
  },
  optionTextCorrect: {
    color: colors.green,
    ...typography.bodyBold,
    fontSize: 13,
  },
  optionTextWrong: {
    color: colors.red,
    ...typography.body,
    fontSize: 13,
  },
  feedbackIcon: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.green,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  resultSection: {
    marginTop: spacing.sm,
  },
  resultCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  resultCardPass: {
    backgroundColor: colors.greenBg,
    borderColor: colors.green,
  },
  resultCardFail: {
    backgroundColor: colors.redBg,
    borderColor: colors.red,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  resultTitle: {
    ...typography.heading,
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  resultScore: {
    ...typography.body,
    fontSize: 14,
    color: colors.t2,
  },
  claimBtn: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  claimBtnDisabled: {
    opacity: 0.6,
  },
  claimBtnText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  retryBtnText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
});

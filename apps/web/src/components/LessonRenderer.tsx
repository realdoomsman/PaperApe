'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Lesson } from '@/lib/curriculum';

// Lazy-load interactive modules
const HoneypotSimulator = dynamic(() => import('./HoneypotSimulator'), { ssr: false });
const SandwichSimulator = dynamic(() => import('./SandwichSimulator'), { ssr: false });

interface LessonRendererProps {
  lesson: Lesson;
  completed: boolean;
  onComplete: (lessonId: string) => void;
  onBack: () => void;
}

export default function LessonRenderer({ lesson, completed, onComplete, onBack }: LessonRendererProps) {
  const handleComplete = () => {
    if (!completed) onComplete(lesson.id);
  };

  return (
    <>
      <button className="btn haptic an" onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to Academy
      </button>

      <div className="learn-detail an an1">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span className={`lesson-badge ${lesson.level}`}>
            {lesson.level === 'beg' ? 'Beginner' : lesson.level === 'int' ? 'Intermediate' : 'Advanced'}
          </span>
          <span className="lesson-time">{lesson.time}</span>
          {lesson.interactiveModuleId && (
            <span className="tag tag-info" style={{ fontSize: 9 }}>
              {lesson.interactiveModuleId === 'quiz' ? 'Quiz'
                : lesson.interactiveModuleId === 'honeypot-sim' ? 'Simulator'
                : lesson.interactiveModuleId === 'sandwich-sim' ? 'Simulator'
                : 'Demo'}
            </span>
          )}
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent-l)', fontWeight: 700 }}>
            +{lesson.reward} SOL
          </span>
        </div>

        <h2 style={{ marginBottom: 8 }}>{lesson.title}</h2>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>{lesson.desc}</p>

        {/* Lesson content paragraphs */}
        {lesson.content.map((p, i) => (
          <p key={i} style={{ marginBottom: i === lesson.content.length - 1 ? 0 : undefined }}>{p}</p>
        ))}

        {/* Interactive Modules */}
        {lesson.interactiveModuleId === 'honeypot-sim' && (
          <HoneypotSimulator onComplete={handleComplete} />
        )}

        {lesson.interactiveModuleId === 'sandwich-sim' && (
          <SandwichSimulator onComplete={handleComplete} />
        )}

        {lesson.interactiveModuleId === 'quiz' && lesson.quizData && (
          <QuizModule quiz={lesson.quizData} onComplete={handleComplete} />
        )}

        {lesson.interactiveModuleId === 'demo' && (
          <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border-1)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>📖 Concept Demo</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
              This lesson covers foundational concepts. Apply them in the Terminal to practice.
            </div>
          </div>
        )}

        {lesson.interactiveModuleId === 'bonding-curve-demo' && (
          <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border-1)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>📈 Bonding Curve Visualization</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
              As more people buy, the price rises exponentially along the curve.
              Early buyers get in cheap. Late buyers pay a premium. When market cap hits ~$69K,
              the token migrates to a standard liquidity pool on Raydium.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {['$0 → $1K', '$1K → $10K', '$10K → $69K'].map((range, i) => (
                <div key={i} style={{ flex: 1, padding: '10px 8px', background: 'var(--bg-3)', borderRadius: 6, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>Phase {i + 1}</div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: i === 2 ? 'var(--green)' : 'var(--t1)' }}>{range}</div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--t3)' }}>{['Stealth', 'Growth', 'Migration'][i]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete button (for non-simulator lessons) */}
        {!['honeypot-sim', 'sandwich-sim'].includes(lesson.interactiveModuleId || '') && (
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button
              className={`btn haptic ${completed ? 'ghost' : 'primary'}`}
              onClick={handleComplete}
              disabled={completed}
            >
              {completed ? '✅ Completed' : `Mark Complete (+${lesson.reward} SOL)`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Quiz Sub-Component ──────────────────────────────── */
function QuizModule({ quiz, onComplete }: { quiz: NonNullable<Lesson['quizData']>; onComplete: () => void }) {
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 24, padding: 18, background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border-1)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 12 }}>Quick Check</div>
      <div style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 14 }}>{quiz.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {quiz.options.map(opt => (
          <button
            key={opt.value}
            className="haptic"
            onClick={() => setAnswer(opt.value)}
            style={{
              padding: '10px 14px', borderRadius: 8, textAlign: 'left', fontSize: 12, fontWeight: 500,
              background: answer === opt.value
                ? (opt.value === quiz.correctAnswer ? 'var(--green-bg)' : 'var(--red-bg)')
                : 'var(--bg-3)',
              border: `1px solid ${answer === opt.value ? (opt.value === quiz.correctAnswer ? 'rgba(0,255,136,0.15)' : 'rgba(255,59,92,0.15)') : 'var(--border-0)'}`,
              color: answer === opt.value ? (opt.value === quiz.correctAnswer ? 'var(--green)' : 'var(--red)') : 'var(--t1)',
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {answer && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: answer === quiz.correctAnswer ? 'var(--green)' : 'var(--red)' }}>
          {answer === quiz.correctAnswer ? 'Correct! 🎉' : `Not quite. The correct answer is: ${quiz.options.find(o => o.value === quiz.correctAnswer)?.text}`}
        </div>
      )}
      {answer === quiz.correctAnswer && (
        <button onClick={onComplete} className="btn primary haptic" style={{ marginTop: 12, fontSize: 12 }}>
          ✅ Complete Lesson — Claim Reward
        </button>
      )}
    </div>
  );
}



'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthContext';
import { apiRequest } from '@/lib/api';
import { CURRICULUM, getAllLessons, getTotalReward, type Lesson, type Category } from '@/lib/curriculum';
import LessonRenderer from '@/components/LessonRenderer';
import { IconChevronRight, IconCheck, IconZap, IconShield, IconTerminal } from '@/components/Icons';

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  zap: IconZap,
  shield: IconShield,
  terminal: IconTerminal,
};

export default function AcademyPage() {
  const { token: authToken } = useAuth();
  const [openCats, setOpenCats] = useState<string[]>([CURRICULUM[0].id]);
  const [selLesson, setSelLesson] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [claimLoading, setClaimLoading] = useState(false);

  // Load progress from API (or localStorage fallback)
  useEffect(() => {
    if (authToken) {
      apiRequest('GET', '/academy/progress', undefined, authToken).then(r => {
        if (r.success && r.data?.completed_lessons) {
          setDone(new Set(r.data.completed_lessons));
        }
      }).catch(() => {
        // Fallback to localStorage
        const s = localStorage.getItem('pa-academy');
        if (s) try { setDone(new Set(JSON.parse(s))); } catch {}
      });
    } else {
      const s = localStorage.getItem('pa-academy');
      if (s) try { setDone(new Set(JSON.parse(s))); } catch {}
    }
  }, [authToken]);

  const toggleCat = (id: string) => setOpenCats(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

  const claimReward = useCallback(async (lessonId: string) => {
    if (done.has(lessonId)) return;
    setClaimLoading(true);

    if (authToken) {
      const r = await apiRequest('POST', '/academy/claim-reward', { lesson_id: lessonId }, authToken);
      if (r.success && r.data?.completed_lessons) {
        setDone(new Set(r.data.completed_lessons));
        localStorage.setItem('pa-academy', JSON.stringify(r.data.completed_lessons));
      }
    } else {
      // Offline mode — save to localStorage
      setDone(prev => {
        const n = new Set(prev);
        n.add(lessonId);
        localStorage.setItem('pa-academy', JSON.stringify([...n]));
        return n;
      });
    }

    setClaimLoading(false);
  }, [authToken, done]);

  const allLessons = getAllLessons();
  const totalLessons = allLessons.length;
  const completedCount = done.size;
  const lesson = selLesson ? allLessons.find(l => l.id === selLesson) : null;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const totalReward = getTotalReward();
  const earnedReward = allLessons.filter(l => done.has(l.id)).reduce((s, l) => s + l.reward, 0);

  return (
    <AppShell>
      <div className="page-head an">
        <div>
          <h1>Academy</h1>
          <div className="page-head-sub">Master trading with {totalLessons} interactive lessons</div>
        </div>
        <div className="page-head-right" style={{ display: 'flex', gap: 8 }}>
          <span className="tag tag-info">{completedCount}/{totalLessons} complete ({pct}%)</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--accent-l)', fontWeight: 700 }}>+{earnedReward}/{totalReward} SOL earned</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card an an1" style={{ marginBottom: 14 }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>Your Progress</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{pct}%</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--green), var(--cyan))' }} />
          </div>

          {/* Category breakdown */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {CURRICULUM.map(cat => {
              const catDone = cat.lessons.filter(l => done.has(l.id)).length;
              const catPct = Math.round((catDone / cat.lessons.length) * 100);
              const catReward = cat.lessons.filter(l => done.has(l.id)).reduce((s, l) => s + l.reward, 0);
              return (
                <div key={cat.id} style={{ fontSize: 10, color: 'var(--t3)', padding: '3px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
                  {cat.name.split(' ')[0]}: {catPct}% (+{catReward} SOL)
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selLesson && lesson ? (
        <LessonRenderer
          lesson={lesson}
          completed={done.has(lesson.id)}
          onComplete={claimReward}
          onBack={() => setSelLesson(null)}
        />
      ) : (
        <div className="an an1">
          {CURRICULUM.map(cat => {
            const isOpen = openCats.includes(cat.id);
            const catDone = cat.lessons.filter(l => done.has(l.id)).length;
            const I = ICON_MAP[cat.icon] || IconZap;
            return (
              <div key={cat.id} className="academy-cat">
                <div className={`cat-header ${isOpen ? 'open' : ''}`} onClick={() => toggleCat(cat.id)}>
                  <div className="cat-left">
                    <div className={`cat-icon feat-icon ${cat.color}`}><I /></div>
                    <div>
                      <div className="cat-name">{cat.name}</div>
                      <div className="cat-count">{catDone}/{cat.lessons.length} complete</div>
                    </div>
                  </div>
                  <IconChevronRight className="cat-chev" />
                </div>
                {isOpen && (
                  <div className="cat-body">
                    {cat.lessons.map(l => (
                      <div key={l.id} className="lesson-row" onClick={() => setSelLesson(l.id)}>
                        <div className={`lesson-check ${done.has(l.id) ? 'done' : ''}`} onClick={e => { e.stopPropagation(); claimReward(l.id); }}>
                          {done.has(l.id) && <IconCheck />}
                        </div>
                        <div className="lesson-info">
                          <div className="lesson-name">{l.title}</div>
                          <div className="lesson-desc-short">{l.desc}</div>
                        </div>
                        <span className={`lesson-badge ${l.level}`}>
                          {l.level === 'beg' ? 'Beginner' : l.level === 'int' ? 'Intermediate' : 'Advanced'}
                        </span>
                        {l.interactiveModuleId && (
                          <span className="tag tag-info" style={{ fontSize: 8, padding: '2px 6px' }}>
                            {l.interactiveModuleId === 'quiz' ? 'Q' : l.interactiveModuleId.includes('sim') ? 'S' : 'D'}
                          </span>
                        )}
                        <span className="mono" style={{ fontSize: 10, color: 'var(--accent-l)', fontWeight: 600, flexShrink: 0 }}>+{l.reward}</span>
                        <span className="lesson-time">{l.time}</span>
                        <IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

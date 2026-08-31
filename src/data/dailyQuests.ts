import { pickSeeded } from '@/lib/seededRandom';

export type QuestCategory = 'count' | 'perfect' | 'time' | 'xp';

export interface TodayMetrics {
  attemptCount: number;
  perfectCount: number;
  timeSpentSeconds: number;
  xpEarned: number;
}

export interface QuestDefinition {
  id: string;
  category: QuestCategory;
  title: string;
  xpLabel: string;
  isMet: (metrics: TodayMetrics) => boolean;
}

export const DAILY_QUEST_POOL: QuestDefinition[] = [
  { id: 'count-1', category: 'count', title: 'Rond 1 oefening af', xpLabel: '+50 XP', isMet: m => m.attemptCount >= 1 },
  { id: 'count-3', category: 'count', title: 'Doe 3 oefeningen vandaag', xpLabel: '+100 XP', isMet: m => m.attemptCount >= 3 },
  { id: 'count-5', category: 'count', title: 'Doe 5 oefeningen vandaag', xpLabel: '+200 XP', isMet: m => m.attemptCount >= 5 },
  { id: 'perfect-1', category: 'perfect', title: 'Haal een perfecte score (3 sterren)', xpLabel: '+150 XP', isMet: m => m.perfectCount >= 1 },
  { id: 'perfect-2', category: 'perfect', title: 'Haal 2x een perfecte score', xpLabel: '+250 XP', isMet: m => m.perfectCount >= 2 },
  { id: 'time-10min', category: 'time', title: 'Oefen 10 minuten vandaag', xpLabel: '+100 XP', isMet: m => m.timeSpentSeconds >= 600 },
  { id: 'xp-150', category: 'xp', title: 'Verdien 150 XP vandaag', xpLabel: '+75 XP', isMet: m => m.xpEarned >= 150 },
];

export type NudgeSubject = 'math' | 'reading' | 'writing';

const SUBJECT_LABEL: Record<NudgeSubject, string> = {
  math: 'Rekenen',
  reading: 'Lezen',
  writing: 'Schrijven',
};

export interface SelectedQuest {
  id: string;
  title: string;
  xp: string;
  done: boolean;
}

const SECONDARY_CATEGORIES: QuestCategory[] = ['perfect', 'time', 'xp'];

/**
 * Pure, deterministic: given the day's RNG, today's metrics, the nudge
 * subject, and whether that subject was practiced today, returns exactly 3
 * quests with `done` already computed. Same rng + metrics + nudge inputs
 * always produce the same 3 quests, which is what keeps the picks stable
 * across re-renders on the same day.
 */
export function selectDailyQuests(
  rng: () => number,
  metrics: TodayMetrics,
  nudgeSubject: NudgeSubject,
  nudgeSubjectAttemptedToday: boolean,
): SelectedQuest[] {
  const countQuest = pickSeeded(DAILY_QUEST_POOL.filter(q => q.category === 'count'), rng);

  const secondaryCategory = pickSeeded(SECONDARY_CATEGORIES, rng);
  const secondaryQuest = pickSeeded(DAILY_QUEST_POOL.filter(q => q.category === secondaryCategory), rng);

  const nudgeQuest: Pick<QuestDefinition, 'id' | 'title' | 'xpLabel' | 'isMet'> = {
    id: `subject-nudge-${nudgeSubject}`,
    title: `Doe een ${SUBJECT_LABEL[nudgeSubject]}-oefening`,
    xpLabel: '+75 XP',
    isMet: () => nudgeSubjectAttemptedToday,
  };

  return [countQuest, secondaryQuest, nudgeQuest].map(q => ({
    id: q.id,
    title: q.title,
    xp: q.xpLabel,
    done: q.isMet(metrics),
  }));
}

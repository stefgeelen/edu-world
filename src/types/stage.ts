export type SubjectType = 'math' | 'reading' | 'writing';

export interface StageExercise {
  id: string;
  order: number;
  title: string;
  subject: SubjectType;
  xpReward: number;
  route: string;
  completions: number;
  bestStars: number;
}

export interface SubjectConfig {
  id: SubjectType;
  label: string;
  icon: React.ElementType;
  emoji: string;
  gradient: string;
  bg: string;
  border: string;
  accent: string;
  progressColor: string;
  progressTrack: string;
}

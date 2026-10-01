import { Award, BookOpen, Crown, Flame, Heart, Sparkles, Star, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';

/** Badge icons are stored by name in the database. */
const BADGE_ICONS: Record<string, LucideIcon> = { Sparkles, Flame, Star, Target, Trophy, BookOpen, Zap, Award, Heart, Crown };

export const badgeIcon = (name: string): LucideIcon => BADGE_ICONS[name] ?? Star;

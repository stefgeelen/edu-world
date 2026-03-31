import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Avatar = {
  id: string;
  name: string;
  imageUrl: string;
  color: string;
  subject: string;
  description: string;
  bgGradient: string;
  accentColor: string;
};

export const avatars: Avatar[] = [
  { 
    id: 'pixel', 
    name: 'Pixel', 
    imageUrl: 'https://images.unsplash.com/photo-1659018966820-de07c94e0d01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZnJpZW5kbHklMjByb2JvdCUyMDNkJTIwY2hhcmFjdGVyfGVufDF8fHx8MTc3NDE2MTk0NHww&ixlib=rb-4.1.0&q=80&w=1080', 
    color: 'bg-blue-500',
    subject: 'Wiskunde',
    description: 'Pixel de robot helpt je met het kraken van de moeilijkste rekensommen! Bereid je voor op supersnelle berekeningen en futuristische puzzels.',
    bgGradient: 'from-blue-600 to-cyan-500',
    accentColor: 'text-cyan-400'
  },
  { 
    id: 'zaza', 
    name: 'Zaza', 
    imageUrl: 'https://images.unsplash.com/photo-1612026934848-464065aa2c8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwM2QlMjBzcGFjZSUyMGFsaWVuJTIwY2hhcmFjdGVyfGVufDF8fHx8MTc3NDE2MTk1M3ww&ixlib=rb-4.1.0&q=80&w=1080', 
    color: 'bg-purple-500',
    subject: 'Wetenschap',
    description: 'Ga op kosmische verkenning met Zaza de axolotl! Ontdek alles van verre planeten tot microscopisch kleine wonderen.',
    bgGradient: 'from-purple-600 to-pink-500',
    accentColor: 'text-pink-400'
  },
  { 
    id: 'riff', 
    name: 'Riff', 
    imageUrl: 'https://images.unsplash.com/photo-1770295333891-3f88ce53eb39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZGlub3NhdXIlMjBjb29sJTIwY2FwJTIwcmFwcGVyJTIwM2QlMjBjYXJ0b29ufGVufDF8fHx8MTc3NDE2MTk0OHww&ixlib=rb-4.1.0&q=80&w=1080', 
    color: 'bg-orange-500',
    subject: 'Taal',
    description: 'Spelling saai? Niet met Riff de raptor! Drop de vetste rhymes en spel je een weg naar de top op de beat van de stad.',
    bgGradient: 'from-orange-600 to-yellow-500',
    accentColor: 'text-yellow-400'
  },
  { 
    id: 'rocco', 
    name: 'Rocco', 
    imageUrl: 'https://images.unsplash.com/photo-1765188987635-a867f4b6693d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwbWVkaWV2YWwlMjB0LXJleCUyMGRpbm9zYXVyJTIwY2hhcmFjdGVyJTIwY2FydG9vbiUyMDNkfGVufDF8fHx8MTc3NDE2MTk0NXww&ixlib=rb-4.1.0&q=80&w=1080', 
    color: 'bg-green-500',
    subject: 'Geschiedenis',
    description: 'Reis terug in de tijd met Rocco! Verken middeleeuwse kastelen, ontmoet ridders en beleef heroïsche avonturen.',
    bgGradient: 'from-green-600 to-emerald-500',
    accentColor: 'text-emerald-400'
  },
  { 
    id: 'sparky', 
    name: 'Sparky', 
    imageUrl: 'https://images.unsplash.com/photo-1767716134775-6787d0def70c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwdGVjaCUyMGN5YmVyJTIwZm94JTIwY2hhcmFjdGVyJTIwM2QlMjBjYXJ0b29ufGVufDF8fHx8MTc3NDE2MTk0NXww&ixlib=rb-4.1.0&q=80&w=1080', 
    color: 'bg-teal-500',
    subject: 'Aardrijkskunde',
    description: 'Sparky de tech-vos kent elke uithoek van de wereld! Hack je door geografische puzzels met zijn slimme cyber-gadgets.',
    bgGradient: 'from-teal-600 to-cyan-500',
    accentColor: 'text-cyan-400'
  },
];

export type Badge = {
  id: string;
  name: string;
  description: string;
  requirement: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
};

export const badgesData: Badge[] = [
  {
    id: 'first-steps',
    name: 'Eerste Stappen',
    description: 'Begin je leeravontuur!',
    requirement: 'Los je eerste vraag op',
    icon: 'Sparkles',
    color: 'bg-yellow-400',
    gradientFrom: '#fbbf24',
    gradientTo: '#f59e0b',
    progress: 0,
    maxProgress: 1,
    isUnlocked: false,
  },
  {
    id: 'fire-streak',
    name: 'Vurige Streak',
    description: 'Hou de vlammen brandend!',
    requirement: 'Behoud 5 dagen streak',
    icon: 'Flame',
    color: 'bg-orange-500',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    progress: 0,
    maxProgress: 5,
    isUnlocked: false,
  },
  {
    id: 'perfect',
    name: 'Perfect!',
    description: 'Onberispelijke prestatie!',
    requirement: 'Haal 10 vragen perfect achter elkaar',
    icon: 'Star',
    color: 'bg-purple-500',
    gradientFrom: '#a855f7',
    gradientTo: '#9333ea',
    progress: 0,
    maxProgress: 10,
    isUnlocked: false,
  },
  {
    id: 'goal-oriented',
    name: 'Doelgericht',
    description: 'Je bent goed op weg!',
    requirement: 'Behaal 500 XP',
    icon: 'Target',
    color: 'bg-blue-500',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    progress: 0,
    maxProgress: 500,
    isUnlocked: false,
  },
  {
    id: 'champion',
    name: 'Kampioen',
    description: 'Meester van de groep!',
    requirement: 'Voltooi alle oefeningen van 1 groep',
    icon: 'Trophy',
    color: 'bg-amber-500',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    progress: 0,
    maxProgress: 6,
    isUnlocked: false,
  },
  {
    id: 'book-master',
    name: 'Boekenmeester',
    description: 'Kennis is kracht!',
    requirement: 'Voltooi 20 lessen',
    icon: 'BookOpen',
    color: 'bg-teal-500',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
    progress: 0,
    maxProgress: 20,
    isUnlocked: false,
  },
  {
    id: 'speed',
    name: 'Snelheid',
    description: 'Bliksem snel!',
    requirement: 'Los 5 vragen in 30 seconden op',
    icon: 'Zap',
    color: 'bg-yellow-500',
    gradientFrom: '#eab308',
    gradientTo: '#ca8a04',
    progress: 0,
    maxProgress: 5,
    isUnlocked: false,
  },
  {
    id: 'collector',
    name: 'Verzamelaar',
    description: 'Badge jager!',
    requirement: 'Verdien 5 verschillende badges',
    icon: 'Award',
    color: 'bg-pink-500',
    gradientFrom: '#ec4899',
    gradientTo: '#db2777',
    progress: 0,
    maxProgress: 5,
    isUnlocked: false,
  },
  {
    id: 'rainbow',
    name: 'Regenboog',
    description: 'Vrienden verzamelaar!',
    requirement: 'Speel met alle 5 karakters',
    icon: 'Heart',
    color: 'bg-rose-500',
    gradientFrom: '#f43f5e',
    gradientTo: '#e11d48',
    progress: 0,
    maxProgress: 5,
    isUnlocked: false,
  },
  {
    id: 'legend',
    name: 'Legende',
    description: 'Ongeëvenaard meesterschap!',
    requirement: 'Bereik niveau 10',
    icon: 'Crown',
    color: 'bg-indigo-500',
    gradientFrom: '#6366f1',
    gradientTo: '#4f46e5',
    progress: 0,
    maxProgress: 10,
    isUnlocked: false,
  },
];
type GameContextType = {
  selectedAvatar: Avatar | null;
  setSelectedAvatar: (avatar: Avatar) => void;
  xp: number;
  addXp: (amount: number) => void;
  streak: number;
  level: number;
  unlockedLevels: number[];
  completeLevel: (level: number) => void;
  badges: Badge[];
  updateBadgeProgress: (badgeId: string, progress: number) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [xp, setXp] = useState(1250);
  const [streak, setStreak] = useState(5);
  const [level, setLevel] = useState(3);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1, 2, 3]);
  const [badges, setBadges] = useState<Badge[]>(badgesData);

  const addXp = (amount: number) => setXp((prev) => prev + amount);
  const completeLevel = (lvl: number) => {
    if (!unlockedLevels.includes(lvl + 1)) {
      setUnlockedLevels([...unlockedLevels, lvl + 1]);
    }
  };

  const updateBadgeProgress = (badgeId: string, progress: number) => {
    setBadges((prev) =>
      prev.map((badge) =>
        badge.id === badgeId
          ? { ...badge, progress, isUnlocked: progress >= badge.maxProgress }
          : badge
      )
    );
  };

  return (
    <GameContext.Provider value={{ selectedAvatar, setSelectedAvatar, xp, addXp, streak, level, unlockedLevels, completeLevel, badges, updateBadgeProgress }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
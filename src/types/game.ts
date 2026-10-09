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

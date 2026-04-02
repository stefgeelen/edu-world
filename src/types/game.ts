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

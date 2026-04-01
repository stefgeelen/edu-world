import confetti from 'canvas-confetti';

type ConfettiIntensity = 'small' | 'medium' | 'large';

const CONFIGS: Record<ConfettiIntensity, { particleCount: number; spread: number }> = {
  small: { particleCount: 100, spread: 70 },
  medium: { particleCount: 140, spread: 75 },
  large: { particleCount: 160, spread: 80 },
};

const DEFAULT_COLORS = ['#14b8a6', '#34d399', '#fcd34d', '#60a5fa'];

export function triggerConfetti(
  intensity: ConfettiIntensity = 'medium',
  options?: { colors?: string[]; originY?: number }
) {
  const cfg = CONFIGS[intensity];
  confetti({
    particleCount: cfg.particleCount,
    spread: cfg.spread,
    origin: { y: options?.originY ?? 0.55 },
    colors: options?.colors ?? DEFAULT_COLORS,
  });
}

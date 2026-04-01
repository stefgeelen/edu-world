import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { triggerConfetti } from '@/lib/confetti';

type ExerciseStatus = 'idle' | 'correct' | 'incorrect';

interface UseExerciseStateOptions {
  totalQuestions?: number;
  xpReward?: number;
  returnPath?: string;
  confettiColors?: string[];
  confettiIntensity?: 'small' | 'medium' | 'large';
  /** Called after correct answer, before navigation/next question */
  onCorrect?: () => void;
  /** Called after incorrect answer */
  onIncorrect?: () => void;
  /** Custom reset logic when moving to next question */
  onNextQuestion?: () => void;
}

export function useExerciseState(options: UseExerciseStateOptions = {}) {
  const {
    totalQuestions = 5,
    xpReward = 10,
    returnPath = '/map',
    confettiColors,
    confettiIntensity = 'medium',
    onCorrect,
    onIncorrect,
    onNextQuestion,
  } = options;

  const navigate = useNavigate();
  const { addXp } = useGame();

  const progressStep = 100 / totalQuestions;

  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExerciseStatus>('idle');

  const handleCorrect = useCallback(() => {
    setStatus('correct');
    addXp(xpReward);
    triggerConfetti(confettiIntensity, { colors: confettiColors });
    onCorrect?.();

    const nextProgress = progress + progressStep;
    setProgress(nextProgress);

    setTimeout(() => {
      if (nextProgress >= 100) {
        navigate(returnPath);
      } else {
        setStatus('idle');
        onNextQuestion?.();
      }
    }, 1800);
  }, [progress, progressStep, xpReward, returnPath, confettiIntensity, confettiColors, addXp, navigate, onCorrect, onNextQuestion]);

  const handleIncorrect = useCallback(() => {
    setStatus('incorrect');
    onIncorrect?.();
    const nextLives = lives - 1;
    setLives(nextLives);

    setTimeout(() => {
      if (nextLives <= 0) {
        navigate(returnPath);
      } else {
        setStatus('idle');
        onNextQuestion?.();
      }
    }, 1600);
  }, [lives, returnPath, navigate, onIncorrect, onNextQuestion]);

  const resetExercise = useCallback(() => {
    setLives(3);
    setProgress(0);
    setStatus('idle');
  }, []);

  return {
    lives,
    progress,
    status,
    setStatus,
    handleCorrect,
    handleIncorrect,
    resetExercise,
  };
}

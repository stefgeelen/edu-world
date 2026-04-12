import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';

type ExerciseStatus = 'idle' | 'correct' | 'incorrect';

interface UseExerciseStateOptions {
  totalQuestions?: number;
  xpReward?: number;
  returnPath?: string;
  confettiColors?: string[];
  confettiIntensity?: 'small' | 'medium' | 'large';
  /** Database exercise ID for persisting results */
  exerciseId?: string;
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
    exerciseId,
    onCorrect,
    onIncorrect,
    onNextQuestion,
  } = options;

  const navigate = useNavigate();
  const completeExercise = useCompleteExercise();

  const progressStep = 100 / totalQuestions;

  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExerciseStatus>('idle');
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const handleCorrect = useCallback(() => {
    setStatus('correct');
    correctCount.current += 1;
    triggerConfetti(confettiIntensity, { colors: confettiColors });
    onCorrect?.();

    const nextProgress = progress + progressStep;
    setProgress(nextProgress);

    setTimeout(() => {
      if (nextProgress >= 100) {
        // Persist to database when exercise is finished
        if (exerciseId) {
          const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
          const score = correctCount.current;
          const stars = lives === 3 ? 3 : lives === 2 ? 2 : 1;
          completeExercise.mutate({
            exerciseId,
            score,
            maxScore: totalQuestions,
            stars,
            timeSpent,
          });
        }
        navigate(returnPath);
      } else {
        setStatus('idle');
        onNextQuestion?.();
      }
    }, 1800);
  }, [progress, progressStep, returnPath, confettiIntensity, confettiColors, navigate, onCorrect, onNextQuestion, exerciseId, lives, totalQuestions, completeExercise]);

  const handleIncorrect = useCallback(() => {
    setStatus('incorrect');
    onIncorrect?.();
    const nextLives = lives - 1;
    setLives(nextLives);

    setTimeout(() => {
      if (nextLives <= 0) {
        // Persist partial results on game over
        if (exerciseId) {
          const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
          const score = correctCount.current;
          completeExercise.mutate({
            exerciseId,
            score,
            maxScore: totalQuestions,
            stars: 0,
            timeSpent,
          });
        }
        navigate(returnPath);
      } else {
        setStatus('idle');
        onNextQuestion?.();
      }
    }, 1600);
  }, [lives, returnPath, navigate, onIncorrect, onNextQuestion, exerciseId, totalQuestions, completeExercise]);

  const resetExercise = useCallback(() => {
    setLives(3);
    setProgress(0);
    setStatus('idle');
    correctCount.current = 0;
    startTime.current = Date.now();
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

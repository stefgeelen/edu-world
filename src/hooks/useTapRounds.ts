import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useSpeech, type SpeechLine } from '@/hooks/useSpeech';
import { exerciseExitPath } from '@/routes/paths';

/**
 * De spellus van de kleuteroefeningen: tik op een antwoord, 3 hartjes, en de
 * Buddy zegt elke vraag vanzelf (een kleuter kan niet lezen). Ook na een fout
 * herhaalt hij de vraag. Game-over betaalt niets: ExerciseShell bewaart hem
 * voor het ouderportaal.
 */
export function useTapRounds<Q, A>({ questions, isRight, say }: {
  questions: Q[];
  isRight: (question: Q, answer: A) => boolean;
  /** Wat de Buddy bij deze vraag zegt: een zin, of zinnen en opgenomen klanken na elkaar. */
  say: (question: Q) => string | SpeechLine[];
}) {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { speak, speakLines } = useSpeech();

  const startTime = useRef(Date.now());
  const correctCount = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [picked, setPicked] = useState<A | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [speaking, setSpeaking] = useState(false);

  const current = questions[round];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const sayQuestion = useCallback(() => {
    if (!current) return;
    setSpeaking(true);
    const lines = say(current);
    (typeof lines === 'string' ? speak(lines) : speakLines(lines)).finally(() => setSpeaking(false));
  }, [current, say, speak, speakLines]);

  // Elke nieuwe vraag zegt de Buddy vanzelf.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(sayQuestion, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const finish = () => {
    if (exerciseId) {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      const stars = lives === 3 ? 3 : lives === 2 ? 2 : 1;
      completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: questions.length, stars, timeSpent });
    }
    navigate(exerciseExitPath());
  };

  const answer = (value: A) => {
    if (!current || status !== 'idle') return;
    setPicked(value);

    if (isRight(current, value)) {
      setStatus('correct');
      correctCount.current += 1;
      triggerConfetti('medium', { colors: ['#10b981', '#f59e0b', '#a855f7'], originY: 0.6 });
      later(() => {
        if (round + 1 >= questions.length) {
          finish();
        } else {
          setRound((r) => r + 1);
          setPicked(null);
          setStatus('idle');
        }
      }, 1500);
    } else {
      setStatus('wrong');
      const nextLives = lives - 1;
      setLives(nextLives);
      later(() => {
        if (nextLives <= 0) {
          navigate(exerciseExitPath());
        } else {
          setPicked(null);
          setStatus('idle');
          sayQuestion();
        }
      }, 1500);
    }
  };

  const progress = questions.length
    ? Math.round(((round + (status === 'correct' ? 1 : 0)) / questions.length) * 100)
    : 0;

  return {
    current,
    round,
    lives,
    picked,
    status,
    speaking,
    progress,
    answer,
    sayQuestion,
    close: () => navigate(exerciseExitPath()),
  };
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt, ExerciseActionBar, CheckButton } from '@/components/exercise/ExerciseParts';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { useExerciseState } from '@/hooks/useExerciseState';
import { useExerciseId } from '@/hooks/useExerciseId';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSpeech } from '@/hooks/useSpeech';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import {
  BUILD_SENTENCES_BY_GRADE,
  BUILD_SENTENCES_GRADE_1,
  FIX_SENTENCES_BY_GRADE,
  FIX_SENTENCES_GRADE_1,
  type FixQuestion,
} from '@/data/sentenceDoctorSentences';
import { buildSentencesUpTo, fixSentencesUpTo } from '@/data/readingThemes';
import { useReadingTheme } from '@/hooks/useReadingTheme';
import { exerciseExitPath } from '@/routes/paths';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface WordItem {
  id: string;
  word: string;
}

interface BuildQuestion {
  mode: 'build';
  correctOrder: WordItem[];
}

type Question = BuildQuestion | FixQuestion;


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function pickUnused<T>(arr: T[], used: Set<number>): { item: T; index: number } {
  const available = arr.map((_, i) => i).filter(i => !used.has(i));
  if (available.length === 0) {
    used.clear();
    const i = Math.floor(Math.random() * arr.length);
    return { item: arr[i], index: i };
  }
  const i = available[Math.floor(Math.random() * available.length)];
  return { item: arr[i], index: i };
}

export function ExerciseSentenceDoctor() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const { grade } = useDifficultyLevel();
  // The 1ste leerjaar follows the reading theme: sentences from thema 5 on,
  // a wrong word to fix from thema 6 on.
  const theme = useReadingTheme();
  const { buildSentences, fixSentences } = useMemo(() => {
    if (theme === undefined) return { buildSentences: [], fixSentences: [] };
    if (theme === null) {
      return {
        buildSentences: BUILD_SENTENCES_BY_GRADE[grade] ?? BUILD_SENTENCES_GRADE_1,
        fixSentences: FIX_SENTENCES_BY_GRADE[grade] ?? FIX_SENTENCES_GRADE_1,
      };
    }
    const t = Math.max(theme, 5);
    return {
      buildSentences: buildSentencesUpTo(t),
      fixSentences: fixSentencesUpTo(t).map((q): FixQuestion => ({
        mode: 'fix',
        sentence: q.sentence,
        wrongIndex: q.wrongIndex,
        wrongWord: q.sentence[q.wrongIndex],
        correctWord: q.correctWord,
        distractors: q.distractors,
      })),
    };
  }, [theme, grade]);

  const [question, setQuestion] = useState<Question | null>(null);
  // build mode: the words still to place (shuffled) and the sentence so far
  const [orderedItems, setOrderedItems] = useState<WordItem[]>([]);
  const [placed, setPlaced] = useState<WordItem[]>([]);
  // fix mode
  const [fixedSentence, setFixedSentence] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  // A word that was fine but tapped as the broken one: shown red until the next question.
  const [tappedGoodIndex, setTappedGoodIndex] = useState<number | null>(null);
  // memoize alternatives so they don't reshuffle on every render
  const [alternatives, setAlternatives] = useState<string[]>([]);

  const usedBuildIndices = useRef<Set<number>>(new Set());
  const usedFixIndices = useRef<Set<number>>(new Set());

  const generateQuestion = useCallback(() => {
    if (buildSentences.length === 0) return;
    const mode = fixSentences.length > 0 && Math.random() >= 0.5 ? 'fix' : 'build';
    if (mode === 'build') {
      const { item: words, index } = pickUnused(buildSentences, usedBuildIndices.current);
      usedBuildIndices.current.add(index);
      const correctOrder: WordItem[] = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
      const shuffled = shuffle(correctOrder);
      // ensure not already correct
      if (shuffled.every((item, i) => item.id === correctOrder[i].id)) {
        shuffled.reverse();
      }
      setQuestion({ mode: 'build', correctOrder });
      setOrderedItems(shuffled);
      setPlaced([]);
    } else {
      const { item: q, index } = pickUnused(fixSentences, usedFixIndices.current);
      usedFixIndices.current.add(index);
      setQuestion(q);
      setFixedSentence([...q.sentence]);
      setAlternatives(shuffle([q.correctWord, ...q.distractors]));
    }
    setPopoverOpen(false);
    setTappedGoodIndex(null);
  }, [buildSentences, fixSentences]);

  const exerciseId = useExerciseId();
  const {
    lives, progress, status, handleCorrect, handleIncorrect,
  } = useExerciseState({
    totalQuestions: 5,
    returnPath: exerciseExitPath(),
    exerciseId,
    confettiIntensity: 'large',
    confettiColors: ['#10b981', '#3b82f6', '#a78bfa'],
    onNextQuestion: generateQuestion,
  });

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  // Auto-speak on new question
  useEffect(() => {
    if (!question) return;
    const text = question.mode === 'build'
      ? question.correctOrder.map(i => i.word).join(' ')
      : question.sentence.join(' ');
    const t = setTimeout(() => speak(text), 600);
    return () => clearTimeout(t);
  }, [question, speak]);

  const handleSpeaker = () => {
    if (!question) return;
    // Build: the child's sentence so far, or the whole sentence as help.
    const text = question.mode === 'build'
      ? (placed.length ? placed : question.correctOrder).map(i => i.word).join(' ')
      : fixedSentence.join(' ');
    return speak(text);
  };

  const handleCheckBuild = () => {
    if (!question || question.mode !== 'build' || status !== 'idle') return;
    if (placed.length !== question.correctOrder.length) return;
    // By word, not id: two "de"s may swap places.
    const isCorrect = placed.every((item, i) => item.word === question.correctOrder[i].word);
    if (isCorrect) handleCorrect(); else handleIncorrect();
  };

  const handlePlace = (item: WordItem) => {
    if (status !== 'idle') return;
    setOrderedItems(prev => prev.filter(i => i.id !== item.id));
    setPlaced(prev => [...prev, item]);
  };

  const handleUnplace = (item: WordItem) => {
    if (status !== 'idle') return;
    setPlaced(prev => prev.filter(i => i.id !== item.id));
    setOrderedItems(prev => [...prev, item]);
  };

  const handlePickWord = (word: string) => {
    if (!question || question.mode !== 'fix' || status !== 'idle') return;
    setPopoverOpen(false);
    const newSentence = [...fixedSentence];
    newSentence[question.wrongIndex] = word;
    setFixedSentence(newSentence);
    if (word === question.correctWord) handleCorrect(); else handleIncorrect();
  };

  // The child taps a word that was not broken: that is a wrong answer.
  const handleTapGoodWord = (index: number) => {
    if (!question || question.mode !== 'fix' || status !== 'idle') return;
    setTappedGoodIndex(index);
    handleIncorrect();
  };

  if (!question) return null;

  const isBuild = question.mode === 'build';

  return (
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate(exerciseExitPath())} explain={[isBuild ? EXPLAIN.sentenceBuild : EXPLAIN.sentenceFix]} silenceBuddy>
      <div className="flex-1 flex flex-col items-center z-10 relative px-4 sm:px-6 mt-6 md:mt-8 w-full max-w-xl mx-auto">

        <ExercisePrompt className="mt-0 md:mt-0">
          {isBuild
            ? 'Tik de woorden in de juiste volgorde.'
            : 'Tik op het foute woord en kies het juiste.'}
        </ExercisePrompt>

        <SpeakerButton onPlay={handleSpeaker} label="Luister naar de zin" className="mb-8" />

        {/* BUILD MODE: a strip with a place per word; tapping a word puts it in
            the next free place, tapping a placed word sends it back. */}
        {isBuild && (
          <>
            <div
              data-testid="sentence-strip"
              className={cn(
                'w-full flex flex-wrap justify-center gap-2 sm:gap-3 rounded-3xl border-2 p-3 sm:p-4 mb-6 min-h-[88px] transition-colors',
                status === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-400/60'
                  : status === 'incorrect'
                    ? 'bg-red-500/15 border-red-400/50'
                    : 'bg-[#1c1134]/60 border-[#3b2d71]',
              )}
            >
              {question.correctOrder.map((_, i) => {
                const item = placed[i];
                return item ? (
                  <motion.button
                    key={item.id}
                    type="button"
                    layoutId={item.id}
                    onClick={() => handleUnplace(item)}
                    disabled={status !== 'idle'}
                    className={cn(
                      WORD_BUTTON,
                      status === 'correct' && 'bg-emerald-400 border-emerald-600 text-white',
                      status === 'incorrect' && 'bg-red-400 border-red-600 text-white',
                    )}
                  >
                    {item.word}
                  </motion.button>
                ) : (
                  <div
                    key={`slot-${i}`}
                    aria-hidden
                    className="min-w-[72px] sm:min-w-[88px] h-[56px] sm:h-[64px] rounded-2xl border-2 border-dashed border-[#a78bfa]/50"
                  />
                );
              })}
            </div>

            <div data-testid="word-pool" className="flex flex-wrap justify-center gap-3 mb-6 min-h-[64px]">
              {orderedItems.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  layoutId={item.id}
                  onClick={() => handlePlace(item)}
                  disabled={status !== 'idle'}
                  whileTap={{ scale: 0.95 }}
                  className={WORD_BUTTON}
                >
                  {item.word}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* FIX MODE */}
        {!isBuild && question.mode === 'fix' && (
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {fixedSentence.map((word, i) => {
              const isWrongSlot = i === question.wrongIndex;
              const isFixed = isWrongSlot && word === question.correctWord;

              if (isWrongSlot && status === 'idle') {
                return (
                  <Popover key={i} open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <motion.button
                        onPointerDown={() => setPopoverOpen(true)}
                        whileTap={{ scale: 0.95 }}
                        className={WORD_BUTTON}
                      >
                        {word}
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-2 bg-[#1c1134] border-2 border-[#3b2d71] rounded-2xl shadow-xl"
                      sideOffset={8}
                    >
                      <div className="flex flex-col gap-2">
                        {alternatives.map((alt) => (
                          <button
                            key={alt}
                            onPointerDown={() => handlePickWord(alt)}
                            className="px-4 py-3 rounded-xl text-base sm:text-lg font-bold text-white/90 bg-[#2d1b54] hover:bg-teal-500 hover:text-white border-b-[4px] border-[#1c1134] hover:border-teal-700 transition-all active:border-b-0 active:translate-y-[4px]"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              }

              const isTappedGood = i === tappedGoodIndex;
              const showsWrong = status === 'incorrect' && (isTappedGood || (isWrongSlot && tappedGoodIndex === null));
              return (
                <motion.button
                  key={i}
                  type="button"
                  onPointerDown={() => handleTapGoodWord(i)}
                  disabled={status !== 'idle'}
                  animate={showsWrong ? { x: [-4, 4, -3, 3, 0] } : {}}
                  className={cn(
                    WORD_BUTTON,
                    isFixed
                      ? 'bg-emerald-400 border-emerald-600 text-white'
                      : showsWrong
                        ? 'bg-red-400 border-red-600 text-white'
                        : undefined,
                  )}
                >
                  {word}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2"
            >
              {status === 'correct' ? (
                <>
                  <Check className="w-8 h-8 text-emerald-400" />
                  <span className="text-xl font-bold text-emerald-400">Goed gedaan!</span>
                </>
              ) : (
                <>
                  <XIcon className="w-8 h-8 text-red-400" />
                  <span className="text-xl font-bold text-red-400">Probeer opnieuw!</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isBuild && (
        <ExerciseActionBar>
          <CheckButton onClick={handleCheckBuild} disabled={status !== 'idle' || placed.length !== question.correctOrder.length} />
        </ExerciseActionBar>
      )}
    </ExerciseShell>
  );
}

/** Every word of a sentence to fix looks the same: the child has to find the broken one. */
const WORD_BUTTON =
  'px-4 py-3 sm:px-5 sm:py-4 rounded-2xl text-lg sm:text-xl font-bold border-b-[5px] transition-colors bg-[#2d1b54] border-[#1c1134] text-white/90 hover:bg-[#3b2d71]';

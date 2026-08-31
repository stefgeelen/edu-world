import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Volume2, Check, X as XIcon, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useExerciseState } from '@/hooks/useExerciseState';
import { useExerciseId } from '@/hooks/useExerciseId';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSpeech } from '@/hooks/useSpeech';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';

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

interface FixQuestion {
  mode: 'fix';
  sentence: string[];
  wrongIndex: number;
  wrongWord: string;
  correctWord: string;
  distractors: string[];
}

type Question = BuildQuestion | FixQuestion;

const BUILD_SENTENCES: string[][] = [
  ['de', 'poes', 'slaapt', 'op', 'de', 'mat'],
  ['ik', 'ga', 'naar', 'school'],
  ['de', 'zon', 'schijnt', 'vandaag'],
  ['mama', 'leest', 'een', 'boek'],
  ['de', 'hond', 'blaft', 'hard'],
  ['wij', 'spelen', 'in', 'de', 'tuin'],
  ['papa', 'kookt', 'het', 'eten'],
  ['het', 'kind', 'lacht', 'hard'],
  ['de', 'vogel', 'zingt', 'mooi'],
  ['ik', 'drink', 'een', 'glas', 'melk'],
  ['de', 'bal', 'rolt', 'weg'],
  ['het', 'meisje', 'lacht', 'vrolijk'],
  ['ik', 'zie', 'een', 'ster'],
  ['de', 'regen', 'valt', 'zacht'],
  ['mama', 'zingt', 'een', 'liedje'],
  ['de', 'boom', 'staat', 'groot'],
  ['papa', 'rijdt', 'op', 'de', 'fiets'],
  ['wij', 'bouwen', 'een', 'hut'],
  ['ik', 'speel', 'met', 'de', 'bal'],
  ['het', 'kind', 'rent', 'snel'],
  ['de', 'hond', 'rent', 'naar', 'huis'],
  ['ik', 'schrijf', 'een', 'brief'],
  ['de', 'appel', 'is', 'rood'],
  ['mama', 'bakt', 'een', 'taart'],
  ['de', 'maan', 'schijnt', 'helder'],
  ['wij', 'spelen', 'een', 'spel'],
  ['het', 'kind', 'tekent', 'een', 'huis'],
  ['de', 'vis', 'zwemt', 'in', 'het', 'meer'],
  ['ik', 'eet', 'een', 'appel'],
  ['de', 'wind', 'waait', 'hard'],
];

const FIX_SENTENCES: FixQuestion[] = [
  { mode: 'fix', sentence: ['de', 'vis', 'vliegt', 'in', 'de', 'kom'], wrongIndex: 2, wrongWord: 'vliegt', correctWord: 'zwemt', distractors: ['zingt', 'danst'] },
  { mode: 'fix', sentence: ['de', 'koe', 'blaft', 'in', 'de', 'wei'], wrongIndex: 2, wrongWord: 'blaft', correctWord: 'loeit', distractors: ['vliegt', 'zingt'] },
  { mode: 'fix', sentence: ['ik', 'slaap', 'in', 'mijn', 'auto'], wrongIndex: 4, wrongWord: 'auto', correctWord: 'bed', distractors: ['boom', 'tafel'] },
  { mode: 'fix', sentence: ['de', 'vogel', 'zwemt', 'in', 'de', 'lucht'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'vliegt', distractors: ['rent', 'slaapt'] },
  { mode: 'fix', sentence: ['we', 'eten', 'soep', 'met', 'een', 'kam'], wrongIndex: 5, wrongWord: 'kam', correctWord: 'lepel', distractors: ['pen', 'sleutel'] },
  { mode: 'fix', sentence: ['de', 'kat', 'leest', 'op', 'de', 'bank'], wrongIndex: 2, wrongWord: 'leest', correctWord: 'slaapt', distractors: ['kookt', 'rijdt'] },
  { mode: 'fix', sentence: ['papa', 'rijdt', 'op', 'een', 'banaan'], wrongIndex: 4, wrongWord: 'banaan', correctWord: 'fiets', distractors: ['appel', 'wortel'] },
  { mode: 'fix', sentence: ['de', 'baby', 'kookt', 'in', 'de', 'wieg'], wrongIndex: 2, wrongWord: 'kookt', correctWord: 'slaapt', distractors: ['rijdt', 'leest'] },
  { mode: 'fix', sentence: ['de', 'zon', 'regent', 'vandaag'], wrongIndex: 2, wrongWord: 'regent', correctWord: 'schijnt', distractors: ['slaapt', 'zingt'] },
  { mode: 'fix', sentence: ['de', 'hond', 'vliegt', 'in', 'de', 'tuin'], wrongIndex: 2, wrongWord: 'vliegt', correctWord: 'rent', distractors: ['zwemt', 'slaapt'] },
  { mode: 'fix', sentence: ['het', 'meisje', 'zwemt', 'op', 'het', 'plein'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'speelt', distractors: ['slaapt', 'kookt'] },
  { mode: 'fix', sentence: ['papa', 'slaapt', 'op', 'het', 'dak'], wrongIndex: 4, wrongWord: 'dak', correctWord: 'bed', distractors: ['tafel', 'stoel'] },
  { mode: 'fix', sentence: ['mama', 'schrijft', 'met', 'een', 'banaan'], wrongIndex: 4, wrongWord: 'banaan', correctWord: 'pen', distractors: ['boek', 'bal'] },
  { mode: 'fix', sentence: ['wij', 'zwemmen', 'in', 'het', 'zand'], wrongIndex: 4, wrongWord: 'zand', correctWord: 'water', distractors: ['park', 'bos'] },
  { mode: 'fix', sentence: ['de', 'bloem', 'loopt', 'in', 'de', 'tuin'], wrongIndex: 2, wrongWord: 'loopt', correctWord: 'groeit', distractors: ['slaapt', 'vliegt'] },
  { mode: 'fix', sentence: ['de', 'beer', 'woont', 'in', 'de', 'zee'], wrongIndex: 5, wrongWord: 'zee', correctWord: 'bos', distractors: ['stad', 'school'] },
  { mode: 'fix', sentence: ['het', 'kind', 'rijdt', 'op', 'een', 'olifant'], wrongIndex: 5, wrongWord: 'olifant', correctWord: 'fiets', distractors: ['stoel', 'boom'] },
  { mode: 'fix', sentence: ['ik', 'eet', 'pudding', 'met', 'een', 'vork'], wrongIndex: 5, wrongWord: 'vork', correctWord: 'lepel', distractors: ['mes', 'bord'] },
  { mode: 'fix', sentence: ['de', 'kat', 'blaft', 'naar', 'de', 'maan'], wrongIndex: 2, wrongWord: 'blaft', correctWord: 'kijkt', distractors: ['zingt', 'zwemt'] },
  { mode: 'fix', sentence: ['het', 'paard', 'zwemt', 'in', 'de', 'wei'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'loopt', distractors: ['vliegt', 'slaapt'] },
  { mode: 'fix', sentence: ['wij', 'slapen', 'op', 'het', 'schoolplein'], wrongIndex: 4, wrongWord: 'schoolplein', correctWord: 'bed', distractors: ['tafel', 'stoel'] },
  { mode: 'fix', sentence: ['de', 'appel', 'groeit', 'in', 'het', 'water'], wrongIndex: 5, wrongWord: 'water', correctWord: 'boom', distractors: ['gras', 'zand'] },
  { mode: 'fix', sentence: ['de', 'vis', 'klimt', 'in', 'de', 'boom'], wrongIndex: 2, wrongWord: 'klimt', correctWord: 'zwemt', distractors: ['vliegt', 'rent'] },
];

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
  const { stage } = useDifficultyLevel();

  const [question, setQuestion] = useState<Question | null>(null);
  // build mode
  const [orderedItems, setOrderedItems] = useState<WordItem[]>([]);
  // fix mode
  const [fixedSentence, setFixedSentence] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  // memoize alternatives so they don't reshuffle on every render
  const [alternatives, setAlternatives] = useState<string[]>([]);

  const usedBuildIndices = useRef<Set<number>>(new Set());
  const usedFixIndices = useRef<Set<number>>(new Set());

  const generateQuestion = useCallback(() => {
    const mode = Math.random() < 0.5 ? 'build' : 'fix';
    if (mode === 'build') {
      const { item: words, index } = pickUnused(BUILD_SENTENCES, usedBuildIndices.current);
      usedBuildIndices.current.add(index);
      const correctOrder: WordItem[] = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
      let shuffled = shuffle(correctOrder);
      // ensure not already correct
      if (shuffled.every((item, i) => item.id === correctOrder[i].id)) {
        shuffled.reverse();
      }
      setQuestion({ mode: 'build', correctOrder });
      setOrderedItems(shuffled);
    } else {
      const { item: q, index } = pickUnused(FIX_SENTENCES, usedFixIndices.current);
      usedFixIndices.current.add(index);
      setQuestion(q);
      setFixedSentence([...q.sentence]);
      setAlternatives(shuffle([q.correctWord, ...q.distractors]));
    }
    setPopoverOpen(false);
  }, []);

  const exerciseId = useExerciseId();
  const {
    lives, progress, status, handleCorrect, handleIncorrect,
  } = useExerciseState({
    totalQuestions: 5,
    xpReward: 10,
    returnPath: '/app/map',
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
    const text = question.mode === 'build'
      ? orderedItems.map(i => i.word).join(' ')
      : fixedSentence.join(' ');
    speak(text);
  };

  const handleCheckBuild = () => {
    if (!question || question.mode !== 'build' || status !== 'idle') return;
    const isCorrect = orderedItems.every((item, i) => item.id === question.correctOrder[i].id);
    isCorrect ? handleCorrect() : handleIncorrect();
  };

  const handlePickWord = (word: string) => {
    if (!question || question.mode !== 'fix' || status !== 'idle') return;
    setPopoverOpen(false);
    const newSentence = [...fixedSentence];
    newSentence[question.wrongIndex] = word;
    setFixedSentence(newSentence);
    word === question.correctWord ? handleCorrect() : handleIncorrect();
  };

  if (!question) return null;

  const isBuild = question.mode === 'build';

  return (
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate(`/app/stage/fluisterbos/${stage}`)} silenceBuddy>
      <div className="flex-1 flex flex-col items-center z-10 relative px-4 sm:px-6 mt-6 md:mt-10 w-full max-w-xl mx-auto">

        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="w-7 h-7 text-emerald-400" />
          <h2 className="text-lg sm:text-xl font-bold text-white/90">
            {isBuild ? 'Maak de zin!' : 'Genees de zin!'}
          </h2>
        </div>

        <p className="text-sm text-white/60 mb-6 text-center">
          {isBuild
            ? 'Sleep de woorden in de juiste volgorde.'
            : 'Tik op het foute woord en kies het juiste.'}
        </p>

        {/* Speaker */}
        <motion.button
          onPointerDown={handleSpeaker}
          whileTap={{ scale: 0.9 }}
          className="relative mb-8 w-16 h-16 sm:w-20 sm:h-20 bg-teal-500 rounded-full flex items-center justify-center border-b-[6px] border-teal-700 shadow-[0_10px_25px_rgba(20,184,166,0.35)] active:border-b-0 active:translate-y-[6px] transition-all"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2 pointer-events-none" />
          <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-md" strokeWidth={2.5} />
        </motion.button>

        {/* BUILD MODE */}
        {isBuild && (
          <>
            <Reorder.Group
              axis="x"
              values={orderedItems}
              onReorder={setOrderedItems}
              className="flex flex-wrap justify-center gap-3 mb-10"
            >
              {orderedItems.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  drag={status === 'idle'}
                  className={cn(
                    'select-none touch-none cursor-grab active:cursor-grabbing',
                    'px-4 py-3 sm:px-5 sm:py-4 rounded-2xl text-lg sm:text-xl font-bold',
                    'border-b-[5px] transition-colors',
                    status === 'correct'
                      ? 'bg-emerald-400 border-emerald-600 text-white'
                      : status === 'incorrect'
                        ? 'bg-red-400 border-red-600 text-white'
                        : 'bg-[#2d1b54] border-[#1c1134] text-white/90 hover:bg-[#3b2d71]',
                  )}
                  whileDrag={{ scale: 1.12, zIndex: 50, boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}
                >
                  {item.word}
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <motion.button
              onPointerDown={handleCheckBuild}
              disabled={status !== 'idle'}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-full max-w-xs py-4 rounded-2xl font-bold text-lg border-b-[6px] transition-all',
                status === 'idle'
                  ? 'bg-emerald-500 border-emerald-700 text-white shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:border-b-0 active:translate-y-[6px]'
                  : 'bg-[#1c1134]/50 border-[#1c1134]/30 text-white/40 cursor-not-allowed',
              )}
            >
              Controleer ✓
            </motion.button>
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
                        className="px-4 py-3 sm:px-5 sm:py-4 rounded-2xl text-lg sm:text-xl font-bold border-b-[5px] bg-red-400/80 border-red-600 text-white animate-pulse"
                      >
                        🩹 {word}
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

              return (
                <motion.span
                  key={i}
                  animate={status === 'incorrect' && isWrongSlot ? { x: [-4, 4, -3, 3, 0] } : {}}
                  className={cn(
                    'px-4 py-3 sm:px-5 sm:py-4 rounded-2xl text-lg sm:text-xl font-bold border-b-[5px] transition-colors',
                    isFixed
                      ? 'bg-emerald-400 border-emerald-600 text-white'
                      : status === 'incorrect' && isWrongSlot
                        ? 'bg-red-400 border-red-600 text-white'
                        : 'bg-[#2d1b54] border-[#1c1134] text-white/90',
                  )}
                >
                  {word}
                </motion.span>
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
    </ExerciseShell>
  );
}

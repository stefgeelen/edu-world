import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt, ExerciseActionBar, CheckButton, ClearButton } from '@/components/exercise/ExerciseParts';
import { ExerciseNumpad, useNumpadSide, numpadInset } from '@/components/exercise/ExerciseNumpad';
import { ExerciseModePicker, type ExerciseMode } from '@/components/exercise/ExerciseModePicker';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { HundredGrid, LooseDotsField, PlaceValueColumns, AnswerBox } from '@/components/exercise/NumberSenseParts';
import { explainNumberSense } from '@/data/exerciseExplanations';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { speakText, stopSpeaking } from '@/hooks/useSpeech';
import { DEFAULT_NUMBER_SENSE } from '@/data/difficultyConfig';
import {
  dutchNumberWord,
  generateNumberSenseRun,
  type NumberSenseMode,
  type NumberSenseQuestion,
} from '@/lib/numberSense';
import { exerciseExitPath } from '@/routes/paths';

/*
 * Getallen tot 100 (2de leerjaar): one tile, five kinds of question after
 * the class worksheet "Blok 3: Getallenkennis". Questions: src/lib/numberSense.ts.
 */

const MODES: ExerciseMode<NumberSenseMode>[] = [
  { value: 'grid-find', title: 'Honderdveld', example: '⭐ = ?' },
  { value: 'listen', title: 'Luister', example: 'welk getal hoor je?' },
  { value: 'group-tens', title: 'Groepjes van 10', example: 'T en E' },
  { value: 'place-value', title: 'H T E', example: 'staafjes en blokjes' },
  { value: 'grid-color', title: 'Kleur het getal', example: 'op het honderdveld' },
  { value: 'mix', title: 'Door elkaar', example: 'van alles wat' },
];

type Status = 'idle' | 'correct' | 'incorrect';

/** Grid size: as big as fits, smaller when the numpad needs the room below. */
const GRID_WITH_NUMPAD = { width: 'min(100%, 26rem, max(15rem, calc(100dvh - 35rem)))' };
const GRID_ALONE = { width: 'min(100%, 30rem, max(16rem, calc(100dvh - 17rem)))' };

export function ExerciseNumberSense() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const config = useExerciseConfig(DEFAULT_NUMBER_SENSE);

  const startTime = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const [mode, setMode] = useState<NumberSenseMode | null>(null);
  const [questions, setQuestions] = useState<NumberSenseQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [lives, setLives] = useState(3);

  // One typed number (honderdveld, luister, H T E) …
  const [inputValue, setInputValue] = useState('');
  // … or T and E (groepjes van 10).
  const [tens, setTens] = useState('');
  const [ones, setOnes] = useState('');
  const [field, setField] = useState<'t' | 'e'>('t');
  // Groepjes van 10: per dot its group, and the group being made.
  const [groupOf, setGroupOf] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  // Kleur het getal.
  const [painted, setPainted] = useState(0);

  const [isNumpadOpen, setIsNumpadOpen] = useState(true);
  const [numpadHeight, setNumpadHeight] = useState(0);
  const numpadSide = useNumpadSide();

  const question = questions[index];
  const runLength = questions.length || 1;
  const progress = (index + (status === 'correct' ? 1 : 0)) * (100 / runLength);

  const groupsMade = groupOf.reduce<number>((max, g) => (g === null ? max : Math.max(max, g + 1)), 0);
  const looseLeft = groupOf.filter((g) => g === null).length;
  const groupingDone = question?.kind === 'group-tens' && looseLeft < 10;

  const usesNumpad =
    !!question && question.kind !== 'grid-color' && (question.kind !== 'group-tens' || groupingDone);

  const resetAnswer = useCallback((q: NumberSenseQuestion | undefined) => {
    setInputValue('');
    setTens('');
    setOnes('');
    setField('t');
    setSelected([]);
    setGroupOf(q?.kind === 'group-tens' ? q.dots.map(() => null) : []);
    setPainted(0);
    setStatus('idle');
    setIsNumpadOpen(true);
  }, []);

  const pickMode = (m: NumberSenseMode) => {
    const run = generateNumberSenseRun(m, config);
    setMode(m);
    setQuestions(run);
    setIndex(0);
    resetAnswer(run[0]);
    startTime.current = Date.now();
  };

  // Luister: the Buddy says the number as soon as the question shows.
  const sayNumber = useCallback(() => (question ? speakText(dutchNumberWord(question.number)) : undefined), [question]);
  useEffect(() => {
    if (question?.kind !== 'listen') return;
    const t = setTimeout(() => { void sayNumber(); }, 400);
    return () => { clearTimeout(t); stopSpeaking(); };
  }, [question, sayNumber]);

  const isRight = (q: NumberSenseQuestion): boolean => {
    switch (q.kind) {
      case 'group-tens':
        return Number(tens) === Math.floor(q.number / 10) && Number(ones) === q.number % 10;
      case 'grid-color':
        return painted === q.number;
      default:
        return parseInt(inputValue, 10) === q.number;
    }
  };

  const canCheck = !!question && status === 'idle' && (
    question.kind === 'group-tens' ? groupingDone && tens !== '' && ones !== '' :
    question.kind === 'grid-color' ? painted > 0 :
    inputValue !== ''
  );

  const handleCheck = () => {
    if (!question || !canCheck) return;
    if (isRight(question)) {
      setStatus('correct');
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.5 });
      timer.current = setTimeout(() => {
        if (index + 1 >= questions.length) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: questions.length, maxScore: questions.length, stars: lives, timeSpent });
          }
          navigate(exerciseExitPath());
        } else {
          setIndex(index + 1);
          resetAnswer(questions[index + 1]);
        }
      }, 1000);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        timer.current = setTimeout(() => navigate(exerciseExitPath()), 1500);
      }
    }
  };

  // ── Numpad ──
  const handleNumber = (num: number | string) => {
    if (status === 'correct') return;
    const digit = String(num);
    if (question?.kind === 'group-tens') {
      const wasWrong = status === 'incorrect';
      if (wasWrong) setStatus('idle');
      if (field === 't') {
        setTens(digit);
        if (wasWrong || ones === '') setField('e');
        if (wasWrong) setOnes('');
      } else {
        setOnes(digit);
        if (wasWrong) setTens('');
      }
      return;
    }
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue(digit);
      return;
    }
    setInputValue((prev) => (prev.length < 3 ? prev + digit : prev));
  };

  const handleDelete = () => {
    if (status === 'incorrect') setStatus('idle');
    if (question?.kind === 'group-tens') {
      if (field === 'e' && ones !== '') setOnes('');
      else if (field === 'e') { setTens(''); setField('t'); }
      else setTens('');
      return;
    }
    setInputValue((prev) => prev.slice(0, -1));
  };

  const tryAgain = () => {
    setInputValue('');
    setTens('');
    setOnes('');
    setField('t');
    setStatus('idle');
  };

  // ── Groepjes van 10 ──
  const addToGroup = (i: number) => {
    if (groupOf[i] !== null || selected.includes(i)) return;
    const next = [...selected, i];
    if (next.length < 10) {
      setSelected(next);
      return;
    }
    const group = groupsMade;
    setGroupOf((prev) => prev.map((g, j) => (next.includes(j) ? group : g)));
    setSelected([]);
  };

  const tapDot = (i: number) => {
    if (status === 'correct') return;
    const group = groupOf[i];
    if (group !== null) {
      // Tapping a group undoes it; later groups keep their colour but shift down a number.
      setGroupOf((prev) => prev.map((g) => (g === group ? null : g !== null && g > group ? g - 1 : g)));
      setTens('');
      setOnes('');
      setField('t');
      setStatus('idle');
      return;
    }
    if (selected.includes(i)) {
      setSelected(selected.filter((j) => j !== i));
      return;
    }
    addToGroup(i);
  };

  const clearGroups = () => {
    setGroupOf((prev) => prev.map(() => null));
    setSelected([]);
    setTens('');
    setOnes('');
    setField('t');
    setStatus('idle');
  };

  // Grouping just finished: open the numpad on T.
  useEffect(() => {
    if (groupingDone) {
      setField('t');
      setIsNumpadOpen(true);
    }
  }, [groupingDone]);

  // ── Kleuren ──
  const paint = (count: number) => {
    if (status === 'correct') return;
    if (status === 'incorrect') setStatus('idle');
    setPainted(Math.max(0, Math.min(100, count)));
  };

  // ── Prompt ──
  const prompt = (() => {
    if (mode === null) return 'Wat wil je oefenen?';
    switch (question?.kind) {
      case 'grid-find': return 'Op welk getal staat het prentje?';
      case 'listen': return 'Welk getal hoor je? Typ het.';
      case 'group-tens': return groupingDone ? 'Hoeveel tientallen (T) en eenheden (E)?' : 'Tik telkens 10 stippen aan.';
      case 'place-value': return 'Welk getal is dit?';
      case 'grid-color': return 'Kleur het getal op het honderdveld.';
      default: return '';
    }
  })();

  const numpadValue = question?.kind === 'group-tens' ? (field === 't' ? tens : ones) : inputValue;
  const showActionBar = !!question && !usesNumpad;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(exerciseExitPath())}
      explain={explainNumberSense(mode, question)}
      onClick={() => usesNumpad && setIsNumpadOpen(false)}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="min-h-full flex flex-col items-center z-10 relative px-4"
          style={numpadInset(usesNumpad && isNumpadOpen, numpadSide, numpadHeight, 48)}
        >
          <ExercisePrompt className="mb-5">{prompt}</ExercisePrompt>

          {mode === null ? (
            <ExerciseModePicker modes={MODES} onPick={pickMode} />
          ) : question && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl flex flex-col items-center gap-5 relative"
              data-testid="number-sense-question"
              data-kind={question.kind}
            >
              {question.kind === 'grid-find' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full">
                  <HundredGrid thing={{ number: question.number, emoji: question.thing.emoji }} style={GRID_WITH_NUMPAD} />
                  <div className="flex items-center gap-3">
                    <span className="text-5xl md:text-6xl" aria-hidden>{question.thing.emoji}</span>
                    <span className="text-5xl md:text-6xl font-black text-[#9d8bce]">=</span>
                    <AnswerBox value={inputValue} status={status} label="Jouw antwoord" onClick={() => setIsNumpadOpen(true)} />
                  </div>
                </div>
              )}

              {question.kind === 'listen' && (
                <div className="flex flex-col items-center gap-8 py-4">
                  <SpeakerButton onPlay={sayNumber} label="Luister naar het getal" />
                  <AnswerBox value={inputValue} status={status} label="Jouw antwoord" onClick={() => setIsNumpadOpen(true)} />
                </div>
              )}

              {question.kind === 'group-tens' && (
                <>
                  <LooseDotsField
                    cols={question.cols}
                    rows={question.rows}
                    dots={question.dots}
                    groupOf={groupOf}
                    selected={selected}
                    onTap={tapDot}
                    onSweep={addToGroup}
                    disabled={status === 'correct'}
                  />
                  <div className="flex items-end gap-4">
                    {(['t', 'e'] as const).map((f) => (
                      <div key={f} className="flex flex-col items-center gap-1">
                        <span className="text-xl font-black text-[#c9bdf0]">{f === 't' ? 'T' : 'E'}</span>
                        <AnswerBox
                          small
                          value={f === 't' ? tens : ones}
                          status={status}
                          active={groupingDone && field === f}
                          disabled={!groupingDone}
                          label={f === 't' ? 'Tientallen' : 'Eenheden'}
                          onClick={() => { setField(f); setIsNumpadOpen(true); }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {question.kind === 'place-value' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full">
                  <PlaceValueColumns number={question.number} />
                  <AnswerBox value={inputValue} status={status} label="Jouw antwoord" onClick={() => setIsNumpadOpen(true)} />
                </div>
              )}

              {question.kind === 'grid-color' && (
                <>
                  <span className="text-6xl md:text-7xl font-black text-cyan-400 leading-none" data-testid="color-target">
                    {question.number}
                  </span>
                  <HundredGrid painted={painted} onPaint={paint} status={status} style={GRID_ALONE} />
                </>
              )}

              <AnimatePresence>
                {status === 'incorrect' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 bg-orange-100/10 px-4 py-2 rounded-full border border-orange-400/30"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-bold text-orange-300 uppercase tracking-wide">Bijna!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {showActionBar && (
        <ExerciseActionBar>
          {question.kind === 'group-tens' ? (
            <>
              <ClearButton onClick={clearGroups} disabled={groupsMade === 0 && selected.length === 0} />
              <CheckButton onClick={handleCheck} disabled />
            </>
          ) : (
            <>
              <ClearButton onClick={() => paint(0)} disabled={painted === 0 || status === 'correct'} />
              <CheckButton onClick={handleCheck} disabled={!canCheck} />
            </>
          )}
        </ExerciseActionBar>
      )}

      {usesNumpad && (
        <ExerciseNumpad
          isOpen={isNumpadOpen}
          onClose={() => setIsNumpadOpen(false)}
          inputValue={numpadValue}
          onNumberClick={handleNumber}
          onDelete={handleDelete}
          onCheck={handleCheck}
          status={status}
          onTryAgain={tryAgain}
          checkDisabled={!canCheck && status === 'idle'}
          onHeightChange={setNumpadHeight}
        />
      )}
    </ExerciseShell>
  );
}

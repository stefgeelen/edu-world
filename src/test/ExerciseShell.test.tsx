import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// The shell saves the attempts that never reach complete_exercise, for the
// parent portal's Aandachtspunten: losing all hearts, and closing the exercise
// after answering at least once. Getting this wrong either hides a child's
// struggle from the parent or invents one.

const recordMock = vi.fn();
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => recordMock }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { ExerciseShell } from '@/components/exercise/ExerciseShell';

function renderShell(props: { progress: number; lives: number }, onClose = vi.fn()) {
  const view = render(
    <ExerciseShell onClose={onClose} {...props}>
      <div />
    </ExerciseShell>
  );
  const close = () => fireEvent.click(view.container.querySelector('button')!);
  const rerender = (next: { progress: number; lives: number }) =>
    view.rerender(
      <ExerciseShell onClose={onClose} {...next}>
        <div />
      </ExerciseShell>
    );
  return { close, rerender, onClose };
}

describe('ExerciseShell — incomplete attempts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves an abandon when the child closes after answering', () => {
    const { close, onClose } = renderShell({ progress: 40, lives: 2 });
    close();

    expect(recordMock).toHaveBeenCalledWith('abandoned', 40, 1);
    expect(onClose).toHaveBeenCalled();
  });

  it('counts a close after only wrong answers as an abandon too', () => {
    const { close } = renderShell({ progress: 0, lives: 1 });
    close();

    expect(recordMock).toHaveBeenCalledWith('abandoned', 0, 2);
  });

  it('does not save anything when the child closes before answering', () => {
    const { close, onClose } = renderShell({ progress: 0, lives: 3 });
    close();

    expect(recordMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not save an abandon once the exercise is finished', () => {
    const { close } = renderShell({ progress: 100, lives: 2 });
    close();

    expect(recordMock).not.toHaveBeenCalled();
  });

  it('saves a game-over once, when the last heart goes', () => {
    const { rerender, close } = renderShell({ progress: 20, lives: 1 });
    rerender({ progress: 20, lives: 0 });
    rerender({ progress: 20, lives: 0 });
    close();

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith('game_over', 20, 3);
  });
});

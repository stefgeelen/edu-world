import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

// The Buddy in the exercise header: explains only when tapped, and stops when
// tapped again, when the child taps anything else, or at the next question.

vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.vosje }) };
});

let finish: () => void = () => {};
const speakLines = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
const stopSpeaking = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ stopSpeaking: vi.fn(), useSpeech: () => ({ speak: vi.fn(), speakLines, stopSpeaking }) }));

import { ExplainButton } from '@/components/exercise/ExplainButton';

beforeEach(() => {
  speakLines.mockClear();
  stopSpeaking.mockClear();
});

describe('ExplainButton', () => {
  it('shows the child their own Buddy and stays quiet until tapped', () => {
    render(<ExplainButton lines={['Uitleg.', 'Vraag?']} />);
    expect(screen.getByRole('button', { name: 'Vosje legt uit' })).toBeInTheDocument();
    expect(speakLines).not.toHaveBeenCalled();
  });

  it('says the explanation and then the question when tapped', async () => {
    render(<ExplainButton lines={['Uitleg.', 'Vraag?']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vosje legt uit' }));

    expect(speakLines).toHaveBeenCalledWith(['Uitleg.', 'Vraag?']);
    expect(screen.getByRole('button', { name: 'Vosje stoppen' })).toHaveAttribute('aria-pressed', 'true');

    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Vosje legt uit' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('stops when tapped again', () => {
    render(<ExplainButton lines={['Uitleg.']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vosje legt uit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vosje stoppen' }));

    expect(stopSpeaking).toHaveBeenCalled();
    expect(speakLines).toHaveBeenCalledTimes(1);
  });

  it('stops when the child starts answering', () => {
    render(
      <>
        <ExplainButton lines={['Uitleg.']} />
        <button type="button">7</button>
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Vosje legt uit' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '7' }));

    expect(stopSpeaking).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Vosje legt uit' })).toBeInTheDocument();
  });

  it('stops at the next question', () => {
    const { rerender } = render(<ExplainButton lines={['Uitleg.', 'Vraag 1?']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vosje legt uit' }));
    rerender(<ExplainButton lines={['Uitleg.', 'Vraag 2?']} />);

    expect(stopSpeaking).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Vosje legt uit' })).toBeInTheDocument();
  });
});

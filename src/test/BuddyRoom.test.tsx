import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// The Buddy Room is judged on what a young child sees and taps: one row per
// Need with its own action button, a hint on the one the Buddy needs, and a
// dialog where an item the child lacks can be bought and used in one tap.

const care = vi.fn();
const buyAndCare = vi.fn();
let buddyFixture: Record<string, unknown>;

vi.mock('@/hooks/useBuddy', () => ({
  BuddyFxProvider: ({ children }: { children: ReactNode }) => children,
  useBuddy: () => ({
    buddy: buddyFixture,
    loaded: true,
    care,
    buyAndCare,
    careBusy: false,
    careFx: null,
    now: Date.UTC(2026, 0, 5, 11, 0, 0), // maandag 12:00 lokaal
  }),
}));

const speak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak }) }));

import { BuddyRoom } from '@/screens/BuddyRoom';

function makeBuddy(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Nootje',
    needs: { hunger: 80, fun: 75, energy: 85, hygiene: 80, health: 100 },
    munten: 20,
    inventory: {},
    lastTick: Date.UTC(2026, 0, 5, 11, 0, 0),
    sleepUntil: null,
    healthZeroSince: null,
    dead: false,
    ...overrides,
  };
}

const renderRoom = () =>
  render(
    <MemoryRouter>
      <BuddyRoom />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  buddyFixture = makeBuddy();
});

describe('BuddyRoom', () => {
  it('pairs every Need with its own Care Action button', () => {
    renderRoom();
    for (const label of ['Voeren', 'Spelen', 'Slapen', 'Wassen', 'Medicijn']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('meter')).toHaveLength(5);
  });

  it('nudges the action the Buddy needs right now', () => {
    buddyFixture = makeBuddy({ needs: { hunger: 5, fun: 75, energy: 85, hygiene: 80, health: 100 } });
    renderRoom();
    expect(screen.getByRole('button', { name: /Voeren/ })).toHaveClass('animate-care-nudge');
    expect(screen.getByRole('button', { name: /Spelen/ })).not.toHaveClass('animate-care-nudge');
  });

  it('buys and uses an item in one tap when the child has none', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: /Voeren/ }));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Koop Hazelnoot voor 12 Munten/ }));
    expect(buyAndCare).toHaveBeenCalledWith('feed', 'noot');
    expect(care).not.toHaveBeenCalled();
  });

  it('uses an owned item without buying it again', () => {
    buddyFixture = makeBuddy({ inventory: { bes: 2 } });
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: /Voeren/ }));

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Geef Bosbes/ }));
    expect(care).toHaveBeenCalledWith('feed', 'bes');
    expect(buyAndCare).not.toHaveBeenCalled();
  });

  it('says how many coins are missing for an item that is too expensive', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: /Voeren/ }));

    const taart = within(screen.getByRole('dialog')).getByRole('button', { name: /Feesttaart kost 25 Munten/ });
    expect(taart).toBeDisabled();
    expect(taart).toHaveTextContent('Nog 5 🪙');
  });

  it('greys out the care buttons while the Buddy naps', () => {
    buddyFixture = makeBuddy({ sleepUntil: Date.UTC(2026, 0, 5, 11, 10, 0) });
    renderRoom();
    expect(screen.getByRole('button', { name: /Voeren/ })).toBeDisabled();
    expect(screen.getByText(/Nootje slaapt nog 10 min/)).toBeInTheDocument();
  });

  it('says its speech bubble out loud once on arrival', () => {
    buddyFixture = makeBuddy({ needs: { hunger: 5, fun: 75, energy: 85, hygiene: 80, health: 100 } });
    const { rerender } = renderRoom();
    rerender(
      <MemoryRouter>
        <BuddyRoom />
      </MemoryRouter>
    );
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Mijn buik knort... heb je iets te eten?');
  });

  it('reads the bubble aloud again when the child taps it', () => {
    renderRoom();
    speak.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Lees voor/ }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toBe(screen.getByRole('button', { name: /Lees voor/ }).textContent);
  });

  it('jumps and says something new when the child taps the Buddy', () => {
    renderRoom();
    const before = screen.getByRole('button', { name: /Lees voor/ }).textContent;
    speak.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Tik op Nootje' }));

    const after = screen.getByRole('button', { name: /Lees voor/ }).textContent;
    expect(after).not.toBe(before);
    expect(speak).toHaveBeenCalledWith(after);
    expect(document.querySelector('.animate-buddy-boop')).not.toBeNull();
  });
});

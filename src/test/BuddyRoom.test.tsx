import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createTestQueryClient, fakeSupabaseChain, queryWrapper } from './testUtils';

// The Buddy Room is judged on what a young child sees and taps: one row per
// Need with its own action button, a hint on the one the Buddy needs, and a
// dialog where an item the child lacks can be bought and used in one tap.

const care = vi.fn();
const buyAndCare = vi.fn();
let buddyFixture: Record<string, unknown>;
let careFxFixture: { action: string; at: number } | null;

vi.mock('@/hooks/useBuddy', () => ({
  BuddyFxProvider: ({ children }: { children: ReactNode }) => children,
  useBuddy: () => ({
    buddy: buddyFixture,
    loaded: true,
    care,
    buyAndCare,
    careBusy: false,
    careFx: careFxFixture,
    now: Date.UTC(2026, 0, 5, 11, 0, 0), // maandag 12:00 lokaal
  }),
}));

vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: { id: 'child-1' } }) }));

const TOUR_KEY = 'leapio:buddy-tour-done:child-1';
const GROWTH_KEY = 'leapio:buddy-growth-seen:child-1';

let menuFixture: unknown;
vi.mock('@/hooks/usePracticeMenu', () => ({ usePracticeMenu: () => ({ data: menuFixture }) }));

let isAdminFixture = false;
vi.mock('@/hooks/useAdminRole', () => ({ useAdminRole: () => ({ isAdmin: isAdminFixture }) }));

let rewardsFixture: unknown[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => fakeSupabaseChain(() => ({ data: rewardsFixture, error: null })) },
}));

vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));

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
    growthStage: 2,
    ...overrides,
  };
}

const renderRoom = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/app/home', state }]}>
      <BuddyRoom />
    </MemoryRouter>,
    // Kept across rerender(), which the tests below use to simulate a re-render.
    { wrapper: queryWrapper(createTestQueryClient()) }
  );

// This jsdom setup has no working localStorage, so give each test a fresh in-memory one.
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('localStorage', memoryStorage());
  buddyFixture = makeBuddy();
  careFxFixture = null;
  menuFixture = undefined;
  rewardsFixture = [];
  isAdminFixture = false;
  // De rondleiding heeft een eigen describe; de andere tests zien de gewone kamer.
  localStorage.setItem(TOUR_KEY, '1');
});

afterEach(() => vi.unstubAllGlobals());

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

  it('uses an item bought in the shop as soon as the child comes back', () => {
    renderRoom({ give: { action: 'feed', itemId: 'bes' } });
    expect(care).toHaveBeenCalledTimes(1);
    expect(care).toHaveBeenCalledWith('feed', 'bes');
  });
});

describe('BuddyRoom — first-visit tour', () => {
  beforeEach(() => localStorage.removeItem(TOUR_KEY));

  const bubble = () => screen.getByRole('button', { name: /Lees voor/ });

  it('starts by asking the child to tap the Buddy, and says so out loud', () => {
    renderRoom();
    expect(bubble()).toHaveTextContent('Hoi! Ik ben Nootje. Tik eens op mij!');
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Hoi! Ik ben Nootje. Tik eens op mij!');
  });

  it('walks from tapping the Buddy to feeding it to the closing step', () => {
    const { rerender } = renderRoom();

    fireEvent.click(screen.getByRole('button', { name: 'Tik op Nootje' }));
    expect(bubble()).toHaveTextContent(/Tik op Voeren/);
    expect(screen.getByRole('button', { name: 'Voeren' })).toHaveClass('animate-care-nudge');

    careFxFixture = { action: 'feed', at: Date.now() };
    rerender(
      <MemoryRouter>
        <BuddyRoom />
      </MemoryRouter>
    );
    expect(bubble()).toHaveTextContent(/Mmm, lekker! Met oefeningen verdien je munten/);
    expect(speak).not.toHaveBeenCalledWith('Mmm, lekker!');

    fireEvent.click(screen.getByRole('button', { name: 'Klaar 👍' }));
    expect(localStorage.getItem(TOUR_KEY)).toBe('1');
    expect(screen.queryByRole('button', { name: 'Klaar 👍' })).not.toBeInTheDocument();
  });

  it('can be skipped and then stays away', () => {
    renderRoom();
    fireEvent.click(screen.getByRole('button', { name: 'Overslaan' }));
    expect(localStorage.getItem(TOUR_KEY)).toBe('1');
    expect(bubble()).not.toHaveTextContent(/Tik eens op mij/);
  });

  it('waits while the Buddy naps, since the steps cannot be done then', () => {
    buddyFixture = makeBuddy({ sleepUntil: Date.UTC(2026, 0, 5, 11, 10, 0) });
    renderRoom();
    expect(bubble()).not.toHaveTextContent(/Tik eens op mij/);
    expect(screen.queryByRole('button', { name: 'Overslaan' })).not.toBeInTheDocument();
  });
});

describe('BuddyRoom — home of the app', () => {
  const menu = (wishes: { title: string; fulfilled: boolean }[]) => ({
    day: '2026-01-05',
    wish_bonus: 5,
    full_munten: 8,
    exercises: [],
    wishes: wishes.map((w, i) => ({
      type_key: `/exercises/type-${i}`,
      title: w.title,
      subject: 'math',
      route: `/exercises/type-${i}/1`,
      fulfilled: w.fulfilled,
    })),
  });

  it('sends the child to the exercise list with one big button', () => {
    renderRoom();
    expect(screen.getByRole('link', { name: /Oefenen!/ })).toHaveAttribute('href', '/app/oefenen');
  });

  it('reaches the shop, the trophy cabinet and the parent portal from the room', () => {
    renderRoom();
    expect(screen.getByRole('link', { name: /Winkel/ })).toHaveAttribute('href', '/app/shop');
    expect(screen.getByRole('link', { name: 'Prijzenkast' })).toHaveAttribute('href', '/app/badges');
    expect(screen.getByRole('link', { name: 'Ouderportaal' })).toHaveAttribute('href', '/app/parent');
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the admin shortcut only to admins', () => {
    isAdminFixture = true;
    renderRoom();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('lists the Buddy’s wishes with their bonus, and ticks off the fulfilled ones', () => {
    menuFixture = menu([
      { title: 'Klok lezen', fulfilled: false },
      { title: 'Geld tellen', fulfilled: true },
    ]);
    renderRoom();
    expect(screen.getByRole('heading', { name: /Wensen van Nootje/ })).toBeInTheDocument();
    const open = screen.getByRole('button', { name: /Klok lezen/ });
    expect(open).toBeEnabled();
    expect(open).toHaveTextContent('+5');
    expect(screen.getByRole('button', { name: /Geld tellen/ })).toBeDisabled();
  });

  it('celebrates when every wish is fulfilled', () => {
    menuFixture = menu([{ title: 'Klok lezen', fulfilled: true }]);
    renderRoom();
    expect(screen.getByRole('heading', { name: /Alle wensen vervuld/ })).toBeInTheDocument();
  });

  it('counts down to a parent’s reward in exercises still to do', async () => {
    rewardsFixture = [
      { id: 'r1', title: 'IJsje', subject: 'math', required_exercises: 10, current_progress: 3 },
      { id: 'r2', title: 'Filmavond', subject: 'reading', required_exercises: 5, current_progress: 4 },
    ];
    renderRoom();
    expect(await screen.findByText(/Nog 7 rekenoefeningen tot: IJsje/)).toBeInTheDocument();
    expect(screen.getByText(/Nog 1 leesoefening tot: Filmavond/)).toBeInTheDocument();
  });

  it('names the Buddy after its growth form and counts down to the next growth', () => {
    // growthStage 2 = 1ste leerjaar, 2de trimester. "Nu" is 5 januari: 86 dagen tot 1 april.
    renderRoom();
    expect(screen.getByRole('heading', { name: 'Baby Nootje' })).toBeInTheDocument();
    expect(screen.getByText(/Groeit over 86 dagen/)).toBeInTheDocument();
  });

  it('does not throw a growth party on the very first visit', () => {
    renderRoom();
    expect(screen.queryByRole('dialog', { name: /gegroeid/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(GROWTH_KEY)).toBe('2');
  });

  it('throws a growth party once when the Buddy has grown since the last visit', () => {
    localStorage.setItem(GROWTH_KEY, '1');
    renderRoom();
    const party = screen.getByRole('dialog', { name: /Nootje is gegroeid/ });
    expect(speak).toHaveBeenCalledWith(expect.stringContaining('ik ben gegroeid'));

    fireEvent.click(within(party).getByRole('button', { name: /Joepie/ }));
    expect(screen.queryByRole('dialog', { name: /gegroeid/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(GROWTH_KEY)).toBe('2');
  });
});

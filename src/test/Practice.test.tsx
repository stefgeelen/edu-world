import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PracticeMenu, PracticeOption } from '@/hooks/usePracticeMenu';

// The exercise list replaces the map: one tile per type of exercise, grouped by
// subject, each showing what it pays right now. Judged on what a child sees.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

let menuState: { data?: PracticeMenu; isLoading: boolean; isError: boolean };
const refetch = vi.fn();
vi.mock('@/hooks/usePracticeMenu', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePracticeMenu')>('@/hooks/usePracticeMenu');
  return { ...actual, usePracticeMenu: () => ({ ...menuState, refetch }) };
});

vi.mock('@/hooks/useBuddy', () => ({ useBuddy: () => ({ buddy: { name: 'Nootje', munten: 23 } }) }));

const speak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak }) }));

let childFixture = { id: 'child-1' };
vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: childFixture }) }));

import { Practice } from '@/screens/Practice';
import { resetSpoken } from '@/lib/spokenOnce';
import { exerciseExitPath } from '@/routes/paths';

const option = (o: Partial<PracticeOption> & Pick<PracticeOption, 'type_key' | 'title' | 'subject'>): PracticeOption => ({
  exercise_id: `${o.type_key}-id`,
  route: `${o.type_key}/2`,
  done_today: 0,
  next_munten: 8,
  wished: false,
  ...o,
});

function makeMenu(overrides: Partial<PracticeMenu> = {}): PracticeMenu {
  return {
    day: '2026-10-01',
    wish_bonus: 5,
    full_munten: 8,
    exercises: [
      option({ type_key: '/exercises/clock', title: 'Klok lezen', subject: 'math', wished: true }),
      option({ type_key: '/exercises/money', title: 'Geld tellen', subject: 'math', done_today: 3, next_munten: 2 }),
      option({ type_key: '/exercises/language', title: 'Woordjes', subject: 'reading' }),
    ],
    wishes: [
      { type_key: '/exercises/clock', title: 'Klok lezen', subject: 'math', route: '/exercises/clock/2', fulfilled: false },
    ],
    ...overrides,
  };
}

const renderPractice = () =>
  render(
    <MemoryRouter>
      <Practice />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  resetSpoken();
  childFixture = { id: 'child-1' };
  menuState = { data: makeMenu(), isLoading: false, isError: false };
});

describe('Practice', () => {
  it('groups the exercises by subject and leaves out subjects without any', () => {
    renderPractice();
    const math = screen.getByRole('region', { name: /Rekenen/ });
    expect(within(math).getAllByRole('button')).toHaveLength(2);
    expect(within(screen.getByRole('region', { name: /Lezen/ })).getByRole('button', { name: /Woordjes/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Schrijven/ })).not.toBeInTheDocument();
  });

  it('starts the exercise the child taps', () => {
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: /Woordjes/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/exercises/language/2');
    // ...and comes back here afterwards, not to the dashboard.
    expect(exerciseExitPath()).toBe('/app/oefenen');
  });

  it('marks a wish and includes its bonus in what the tile pays', () => {
    renderPractice();
    const tile = screen.getByRole('button', { name: /^Klok lezen/ });
    expect(tile).toHaveAccessibleName(/13 Munten, een wens van je Buddy/);
    expect(tile).toHaveTextContent('Wens');
    expect(tile).toHaveTextContent('+13');
  });

  it('shows a repeated type pays less, in the Buddy’s words', () => {
    renderPractice();
    const tile = screen.getByRole('button', { name: /Geld tellen/ });
    expect(tile).toHaveTextContent('+2');
    expect(tile).toHaveTextContent('Ken ik al!');
    expect(screen.getByRole('button', { name: /Woordjes/ })).not.toHaveTextContent('Ken ik al!');
  });

  it('drops the wish ribbon once the wish is fulfilled today', () => {
    menuState.data = makeMenu({
      exercises: [option({ type_key: '/exercises/clock', title: 'Klok lezen', subject: 'math', wished: true, done_today: 1 })],
    });
    renderPractice();
    const tile = screen.getByRole('button', { name: /^Klok lezen/ });
    expect(tile).not.toHaveTextContent('Wens');
    expect(tile).toHaveTextContent('+8');
  });

  it('reads its greeting aloud once, naming an open wish', () => {
    const { rerender } = renderPractice();
    rerender(
      <MemoryRouter>
        <Practice />
      </MemoryRouter>
    );
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Mijn wens: Klok lezen! Maar kies gerust wat jij wil.');
  });

  it('stays quiet when coming back to the same greeting in this session', () => {
    renderPractice().unmount();
    renderPractice();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('reads a new greeting, even after the old one was read', () => {
    renderPractice().unmount();
    menuState.data = makeMenu({
      wishes: [{ type_key: '/exercises/clock', title: 'Klok lezen', subject: 'math', route: '/exercises/clock/2', fulfilled: true }],
    });
    renderPractice();
    expect(speak).toHaveBeenLastCalledWith('Al mijn wensen zijn vervuld! Wat doen we nu?');
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('reads the greeting again for a brother or sister on the same tablet', () => {
    renderPractice().unmount();
    childFixture = { id: 'child-2' };
    renderPractice();
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('always reads the greeting from the speaker button', () => {
    renderPractice().unmount();
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: /^Lees voor/ }));
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('says so when there are no exercises yet for this grade', () => {
    menuState.data = makeMenu({ exercises: [], wishes: [] });
    renderPractice();
    expect(screen.getByText('Hier staan nog geen oefeningen')).toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', () => {
    menuState = { data: undefined, isLoading: false, isError: true };
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw proberen' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows a spinner while there is no list yet, even when a retry is paused', () => {
    menuState = { data: undefined, isLoading: false, isError: false };
    renderPractice();
    expect(screen.getByRole('status', { name: 'Oefeningen laden' })).toBeInTheDocument();
  });

  it('shows a spinner while loading, not an empty list', () => {
    menuState = { data: undefined, isLoading: true, isError: false };
    renderPractice();
    expect(screen.getByRole('status', { name: 'Oefeningen laden' })).toBeInTheDocument();
    expect(screen.queryByText('Hier staan nog geen oefeningen')).not.toBeInTheDocument();
  });

  it('keeps Herhalen folded behind a button, and opens the lower grade version', () => {
    menuState = {
      data: makeMenu({
        review: [option({ type_key: '/exercises/dots', title: 'Stippen tellen', subject: 'math', route: '/exercises/dots/3', grade: 1 })],
      }),
      isLoading: false,
      isError: false,
    };
    renderPractice();
    const review = screen.getByRole('region', { name: 'Herhalen' });
    const toggle = within(review).getByRole('button', { name: 'Herhalen' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Stippen tellen/ })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(review).getByText('Oefeningen uit het 1ste leerjaar')).toBeInTheDocument();
    // Its own tile, not mixed in with the child's grade.
    expect(within(screen.getByRole('region', { name: /Rekenen/ })).queryByRole('button', { name: /Stippen/ })).not.toBeInTheDocument();

    fireEvent.click(within(review).getByRole('button', { name: /Stippen tellen, 8 Munten/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/exercises/dots/3?leerjaar=1');
    expect(exerciseExitPath()).toBe('/app/oefenen');
  });

  it('has no Herhalen in the 1ste leerjaar', () => {
    menuState = { data: makeMenu({ review: [] }), isLoading: false, isError: false };
    renderPractice();
    expect(screen.queryByRole('region', { name: 'Herhalen' })).not.toBeInTheDocument();
  });

  it('leads back to the dashboard', () => {
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar het dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });
});

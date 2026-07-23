import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// Dashboard.tsx is CLAUDE.md's own headline example of a high-risk file (514
// lines, many queries, an eslint-disabled effect). Rather than fight its
// heavy decorative markup, every child component with its own data
// dependency is stubbed out so these tests isolate Dashboard's own logic:
// daily-quest completion, XP/level display, badge showcase selection, the
// admin-only button, and sign-out cleanup.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const useGameMock = vi.fn();
vi.mock('@/context/GameContext', () => ({
  useGame: () => useGameMock(),
}));

const useAdminRoleMock = vi.fn();
vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => useAdminRoleMock(),
}));

const useChildProgressMock = vi.fn();
vi.mock('@/hooks/useChildProgress', () => ({
  useChildProgress: () => useChildProgressMock(),
}));

const useBuddyMessageMock = vi.fn();
vi.mock('@/hooks/useBuddyMessage', () => ({
  useBuddyMessage: () => useBuddyMessageMock(),
}));

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

const useChildGreetingMock = vi.fn();
vi.mock('@/hooks/useChildGreeting', () => ({
  useChildGreeting: () => useChildGreetingMock(),
}));

vi.mock('@/components/ChildRewards', () => ({ ChildRewards: () => <div data-testid="child-rewards-stub" /> }));
vi.mock('@/components/JourneyCard', () => ({ JourneyCard: () => <div data-testid="journey-card-stub" /> }));
vi.mock('@/components/BuddyBubble', () => ({ BuddyBubble: () => <div data-testid="buddy-bubble-stub" /> }));
vi.mock('@/components/figma/ImageWithFallback', () => ({ ImageWithFallback: (p: { alt?: string }) => <img alt={p.alt} /> }));

const signOutMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signOut: (...args: unknown[]) => signOutMock(...args) },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { Dashboard } from '@/screens/Dashboard';

const BADGE_UNLOCKED = (id: string, name = id) => ({
  id, name, description: '', requirement: '', icon: 'Sparkles', color: '', gradientFrom: '#111', gradientTo: '#222',
  progress: 1, maxProgress: 1, isUnlocked: true,
});
const BADGE_IN_PROGRESS = (id: string, progress: number, maxProgress: number) => ({
  id, name: id, description: '', requirement: '', icon: 'Flame', color: '', gradientFrom: '#111', gradientTo: '#222',
  progress, maxProgress, isUnlocked: false,
});

function setDefaults(overrides: Partial<{ isAdmin: boolean; todayAttempts: number; streak: number; badges: unknown[] }> = {}) {
  useGameMock.mockReturnValue({
    selectedAvatar: { name: 'Milo', imageUrlHead: '/milo.png' },
    xp: 250,
    streak: overrides.streak ?? 2,
    level: 3,
    badges: overrides.badges ?? [],
  });
  useAdminRoleMock.mockReturnValue({ isAdmin: overrides.isAdmin ?? false });
  useChildProgressMock.mockReturnValue({ progressData: [] });
  useBuddyMessageMock.mockReturnValue({ getMessage: vi.fn(() => null), hasAvatar: true });
  useCurrentChildMock.mockReturnValue({ data: { id: 'child-1' } });
  useChildGreetingMock.mockReturnValue({ greeting: 'Hallo, Timmy!', childName: 'Timmy' });
  fromMock.mockReturnValue(fakeSupabaseChain({ data: null, error: null, count: overrides.todayAttempts ?? 0 }));
}

function renderDashboard() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return { ...render(
    <MemoryRouter>
      <Wrapper><Dashboard /></Wrapper>
    </MemoryRouter>
  ), queryClient };
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaults();
  });

  it('shows the greeting, level, and XP from the game context', () => {
    renderDashboard();
    expect(screen.getByText('Hallo, Timmy!')).toBeInTheDocument();

    // "3" and "250" aren't unique in the tree on their own (badge counters,
    // decorative text, etc. can coincidentally match), so scope the lookup to
    // the labeled card that actually renders level/xp.
    const levelLabel = screen.getByText('Huidig Niveau');
    const levelValue = levelLabel.parentElement?.querySelector('span');
    expect(levelValue).toHaveTextContent('3');

    const xpLabel = screen.getByText('XP');
    const xpCard = xpLabel.closest('div');
    expect(xpCard).toHaveTextContent('250');
  });

  it('hides the admin shortcut for a non-admin parent', () => {
    setDefaults({ isAdmin: false });
    renderDashboard();
    expect(screen.queryByTitle('Admin')).not.toBeInTheDocument();
  });

  it('shows the admin shortcut and navigates to /admin when clicked', () => {
    setDefaults({ isAdmin: true });
    renderDashboard();
    fireEvent.click(screen.getByTitle('Admin'));
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('navigates to the map when the "start adventure" card is clicked', () => {
    renderDashboard();
    fireEvent.click(screen.getByText(/avontuur/i, { selector: 'span.block' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/map');
  });

  it('marks the streak quest done once the streak reaches 5 days', () => {
    setDefaults({ streak: 5 });
    renderDashboard();
    // The done/undone styling (incl. line-through) lives on the title <span>
    // itself, not a wrapping <div> — getByText already returns that span.
    const questTitle = screen.getByText('Behoud een reeks van 5 dagen');
    expect(questTitle.className).toMatch(/line-through/);
  });

  it('leaves the streak quest undone below a 5-day streak', () => {
    setDefaults({ streak: 4 });
    renderDashboard();
    const questTitle = screen.getByText('Behoud een reeks van 5 dagen');
    expect(questTitle.className).not.toMatch(/line-through/);
  });

  it('marks exercise-count quests done once today\'s attempts clear their threshold', async () => {
    setDefaults({ todayAttempts: 3 });
    renderDashboard();

    await waitFor(() => {
      const oneEx = screen.getByText('Rond 1 oefening af');
      expect(oneEx.className).toMatch(/line-through/);
    });
    const threeEx = screen.getByText('Doe 3 oefeningen vandaag');
    expect(threeEx.className).toMatch(/line-through/);
  });

  it('shows up to 3 unlocked badges in the trophy showcase, ignoring locked ones', () => {
    setDefaults({ badges: [BADGE_UNLOCKED('b1'), BADGE_UNLOCKED('b2'), BADGE_IN_PROGRESS('b3', 2, 5)] });
    renderDashboard();
    expect(screen.getByText('2 / 3 verdiend')).toBeInTheDocument();
  });

  it('surfaces the in-progress badge with the highest completion ratio as "next"', () => {
    setDefaults({
      badges: [
        BADGE_IN_PROGRESS('slow', 1, 10), // 10%
        BADGE_IN_PROGRESS('almost-there', 8, 10), // 80%
      ],
    });
    renderDashboard();
    expect(screen.getByText('almost-there')).toBeInTheDocument();
    expect(screen.queryByText('slow')).not.toBeInTheDocument();
  });

  it('signs out, clears the query cache, and navigates to /auth even if Supabase sign-out fails', async () => {
    // NOTE / possible real bug: unlike AuthContext.signOut() (which wraps
    // supabase.auth.signOut() in try/catch), Dashboard's handleSignOut only
    // has try/finally — a rejected signOut() still cleans up and navigates
    // (asserted below), but the rejection itself is never caught, so it
    // surfaces as an unhandled promise rejection. That matches production
    // behavior, so it's swallowed here rather than worked around, to keep
    // this test's failure mode about the cleanup logic, not this rejection.
    const swallowExpectedRejection = () => {};
    process.on('unhandledRejection', swallowExpectedRejection);

    signOutMock.mockRejectedValue(new Error('network down'));
    const { queryClient } = renderDashboard();
    const clearSpy = vi.spyOn(queryClient, 'clear');

    fireEvent.click(screen.getByTitle('Uitloggen'));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/auth'));
    expect(clearSpy).toHaveBeenCalled();

    process.off('unhandledRejection', swallowExpectedRejection);
  });
});

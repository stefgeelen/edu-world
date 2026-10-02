import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper } from './testUtils';
import type { PracticeMenu, PracticeOption } from '@/hooks/usePracticeMenu';

// The dashboard tab: every exercise is one or two taps away, next to the
// Buddy's wishes, the trophy room and the parent's rewards.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

let menuFixture: PracticeMenu | undefined;
vi.mock('@/hooks/usePracticeMenu', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePracticeMenu')>('@/hooks/usePracticeMenu');
  return { ...actual, usePracticeMenu: () => ({ data: menuFixture }) };
});

let rewardsFixture: unknown[] = [];
vi.mock('@/hooks/useChildRewards', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useChildRewards')>('@/hooks/useChildRewards');
  return { ...actual, useChildRewards: () => ({ data: rewardsFixture }) };
});

let badgesFixture: unknown[] = [];
vi.mock('@/context/GameContext', () => ({
  useGame: () => ({ selectedAvatar: { name: 'Fia', imageUrlHead: '' }, badges: badgesFixture }),
}));
vi.mock('@/hooks/useChildGreeting', () => ({ useChildGreeting: () => ({ greeting: 'Hallo, Lien!', childName: 'Lien' }) }));

let isAdminFixture = false;
vi.mock('@/hooks/useAdminRole', () => ({ useAdminRole: () => ({ isAdmin: isAdminFixture }) }));

const signOut = vi.fn().mockResolvedValue({});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: () => signOut() } } }));

import { Dashboard } from '@/screens/Dashboard';

const option = (o: Partial<PracticeOption> & Pick<PracticeOption, 'type_key' | 'title'>): PracticeOption => ({
  exercise_id: o.type_key,
  subject: 'math',
  route: `${o.type_key}/1`,
  done_today: 0,
  next_munten: 8,
  wished: false,
  ...o,
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
    { wrapper: queryWrapper(createTestQueryClient()) }
  );

beforeEach(() => {
  vi.clearAllMocks();
  isAdminFixture = false;
  rewardsFixture = [];
  badgesFixture = [
    { id: 'first-steps', name: 'Eerste Stappen', icon: 'Sparkles', gradientFrom: '#fff', gradientTo: '#000', progress: 1, maxProgress: 1, isUnlocked: true },
    { id: 'goal-oriented', name: 'Doelgericht', icon: 'Target', gradientFrom: '#fff', gradientTo: '#000', progress: 12, maxProgress: 50, isUnlocked: false },
  ];
  menuFixture = {
    day: '2026-10-02',
    wish_bonus: 5,
    full_munten: 8,
    exercises: [
      option({ type_key: '/exercises/money', title: 'Geld rekenen', done_today: 3, next_munten: 2 }),
      option({ type_key: '/exercises/clock', title: 'Klokkijken', wished: true }),
      option({ type_key: '/exercises/dots', title: 'Stippen tellen' }),
    ],
    wishes: [
      { type_key: '/exercises/clock', title: 'Klokkijken', subject: 'math', route: '/exercises/clock/1', fulfilled: false },
      { type_key: '/exercises/money', title: 'Geld rekenen', subject: 'math', route: '/exercises/money/1', fulfilled: true },
    ],
  };
});

describe('Dashboard', () => {
  it('opens the full exercise list from the big green button', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Alle oefeningen/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/oefenen');
  });

  it('offers quick starts with the open wish first and the repeated type last', () => {
    renderDashboard();
    const quick = within(screen.getByRole('region', { name: 'Snel starten' })).getAllByRole('button');
    expect(quick.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Start Klokkijken, 13 Munten, een wens van je Buddy',
      'Start Stippen tellen, 8 Munten',
      'Start Geld rekenen, 2 Munten',
    ]);
    fireEvent.click(quick[1]);
    expect(navigateMock).toHaveBeenCalledWith('/app/exercises/dots/1');
  });

  it('lists the Buddy’s wishes in the old quest style, starting one on tap', () => {
    renderDashboard();
    const wishes = screen.getByRole('region', { name: /Wensen van Fia/ });
    expect(within(wishes).getByText('1 / 2 vervuld')).toBeInTheDocument();
    fireEvent.click(within(wishes).getByRole('button', { name: /Klokkijken/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/exercises/clock/1');
    expect(within(wishes).getByRole('button', { name: /Geld rekenen/ })).toBeDisabled();
  });

  it('shows the trophy room and opens the Prijzenkast', () => {
    renderDashboard();
    const room = screen.getByRole('button', { name: 'Trofeeënkamer' });
    expect(room).toHaveTextContent('1 / 2 verdiend');
    expect(room).toHaveTextContent('Doelgericht');
    fireEvent.click(room);
    expect(navigateMock).toHaveBeenCalledWith('/app/badges');
  });

  it('counts down to the parent’s rewards', () => {
    rewardsFixture = [{ id: 'r1', title: 'IJsje', subject: 'math', required_exercises: 10, current_progress: 3 }];
    renderDashboard();
    expect(screen.getByText('Nog 7 rekenoefeningen tot: IJsje')).toBeInTheDocument();
  });

  it('hides wishes, quick starts and rewards it has nothing for', () => {
    menuFixture = undefined;
    renderDashboard();
    expect(screen.queryByRole('region', { name: 'Snel starten' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Wensen/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Mijn beloningen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alle oefeningen/ })).toBeInTheDocument();
  });

  it('shows no XP, level or streak', () => {
    renderDashboard();
    expect(screen.queryByText(/XP|Niveau|streak/i)).not.toBeInTheDocument();
  });

  it('reaches the parent portal, and the admin only for admins', () => {
    renderDashboard();
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouderportaal' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent');
  });

  it('signs out and returns to the login screen', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Uitloggen' }));
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/auth'));
    expect(signOut).toHaveBeenCalled();
  });
});

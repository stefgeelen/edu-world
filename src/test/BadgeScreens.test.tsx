import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const badge = (id: string, name: string, progress: number, maxProgress: number, isUnlocked: boolean) => ({
  id,
  name,
  description: `${name} beschrijving`,
  requirement: `Doe ${maxProgress} keer iets`,
  icon: 'Star',
  color: '',
  gradientFrom: '#fbbf24',
  gradientTo: '#f59e0b',
  progress,
  maxProgress,
  isUnlocked,
});

let badgesFixture = [badge('first-steps', 'Eerste Stappen', 1, 1, true), badge('goal-oriented', 'Doelgericht', 12, 50, false)];
vi.mock('@/context/GameContext', () => ({ useGame: () => ({ badges: badgesFixture }) }));

const triggerConfetti = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...a: unknown[]) => triggerConfetti(...a) }));

import { BadgeOverview } from '@/screens/BadgeOverview';
import { BadgeDetail } from '@/screens/BadgeDetail';

const renderDetail = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/app/badges/${id}`]}>
      <Routes>
        <Route path="/app/badges/:id" element={<BadgeDetail />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  badgesFixture = [badge('first-steps', 'Eerste Stappen', 1, 1, true), badge('goal-oriented', 'Doelgericht', 12, 50, false)];
});

describe('BadgeOverview (Prijzenkast)', () => {
  it('counts the earned trophies', () => {
    render(<MemoryRouter><BadgeOverview /></MemoryRouter>);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('1 van 2 verdiend')).toBeInTheDocument();
  });

  it('shows progress on a trophy that is not earned yet', () => {
    render(<MemoryRouter><BadgeOverview /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Eerste Stappen, verdiend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doelgericht, 12 van 50' })).toHaveTextContent('12/50');
  });

  it('opens a trophy and leads back to the Buddy', () => {
    render(<MemoryRouter><BadgeOverview /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Doelgericht/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/badges/goal-oriented');
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar je Buddy' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/home');
  });

  it('encourages a child without any trophy yet', () => {
    badgesFixture = [badge('goal-oriented', 'Doelgericht', 0, 50, false)];
    render(<MemoryRouter><BadgeOverview /></MemoryRouter>);
    expect(screen.getByText('Hier komen jouw trofeeën te staan!')).toBeInTheDocument();
  });
});

describe('BadgeDetail', () => {
  it('explains how to earn a trophy and how far along the child is', () => {
    renderDetail('goal-oriented');
    expect(screen.getByRole('heading', { name: 'Doelgericht' })).toBeInTheDocument();
    expect(screen.getByText('Doe 50 keer iets')).toBeInTheDocument();
    expect(screen.getByText('Nog 38 te gaan')).toBeInTheDocument();
    expect(screen.getByText('Nog niet verdiend')).toBeInTheDocument();
  });

  it('celebrates an earned trophy, and cancels the party if the child leaves first', () => {
    vi.useFakeTimers();
    const { unmount } = renderDetail('first-steps');
    expect(screen.getByText('Verdiend!')).toBeInTheDocument();
    unmount();
    vi.advanceTimersByTime(500);
    expect(triggerConfetti).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('says so for an unknown trophy', () => {
    renderDetail('nope');
    expect(screen.getByText('Deze trofee bestaat niet')).toBeInTheDocument();
  });
});

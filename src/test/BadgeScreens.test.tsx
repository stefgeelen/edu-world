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
vi.mock('@/hooks/useChildGreeting', () => ({ useChildGreeting: () => ({ childName: 'Lien' }) }));

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
  const renderOverview = () => render(<MemoryRouter><BadgeOverview /></MemoryRouter>);

  it('counts the earned trophies', () => {
    renderOverview();
    expect(screen.getByText('1 van 2 badges ontgrendeld')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows progress on a trophy that is not earned yet', () => {
    renderOverview();
    expect(screen.getByText('12/50')).toBeInTheDocument();
    expect(screen.getByText('Behaald')).toBeInTheDocument();
  });

  it('opens a trophy, and leads back to the dashboard it came from', () => {
    renderOverview();
    fireEvent.click(screen.getByText('Doelgericht'));
    expect(navigateMock).toHaveBeenCalledWith('/app/badges/goal-oriented');
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar het dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });

  it('encourages a child without any trophy yet', () => {
    badgesFixture = [badge('goal-oriented', 'Doelgericht', 0, 50, false)];
    renderOverview();
    expect(screen.getByText('Lien, hier komen jouw trofeeën te staan!')).toBeInTheDocument();
  });
});

describe('BadgeDetail', () => {
  it('explains how to earn a trophy and how far along the child is', () => {
    renderDetail('goal-oriented');
    expect(screen.getByRole('heading', { name: 'Doelgericht' })).toBeInTheDocument();
    expect(screen.getByText('Doe 50 keer iets')).toBeInTheDocument();
    expect(screen.getByText('Nog 38 te gaan!')).toBeInTheDocument();
    expect(screen.getByText('Nog Niet Behaald')).toBeInTheDocument();
  });

  it('celebrates an earned trophy, and cancels the party if the child leaves first', () => {
    vi.useFakeTimers();
    const { unmount } = renderDetail('first-steps');
    expect(screen.getByText('Badge Behaald!')).toBeInTheDocument();
    unmount();
    vi.advanceTimersByTime(500);
    expect(triggerConfetti).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('says so for an unknown trophy, with a way back', () => {
    renderDetail('nope');
    expect(screen.getByText('Badge niet gevonden')).toBeInTheDocument();
  });
});

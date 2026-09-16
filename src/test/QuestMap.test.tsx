import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// QuestMap derives every checkpoint's lock state from `stages`, which falls back
// to [] both while the query is in flight and when it fails. getCheckpointStatus
// reads a missing stage as "locked", so a failed query used to render a complete,
// plausible-looking map on which nothing was clickable and nothing explained why.
// A missing child_exercise_stats function presented exactly like that in
// production. These tests pin the three states apart.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const refetchMock = vi.fn();
let masteryState: Record<string, unknown>;
vi.mock('@/hooks/useStageMastery', () => ({
  useStageMastery: () => masteryState,
}));

vi.mock('@/context/GameContext', () => ({
  useGame: () => ({ selectedAvatar: null }),
}));
vi.mock('@/hooks/useBuddyMessage', () => ({
  useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }),
}));
vi.mock('@/hooks/useChildGreeting', () => ({
  useChildGreeting: () => ({ childName: 'Emma' }),
}));
vi.mock('@/components/BuddyCompanion', () => ({
  BuddyCompanion: () => null,
}));
vi.mock('@/components/BuddyBubble', () => ({
  BuddyBubble: () => null,
}));

import { QuestMap } from '@/screens/QuestMap';

const UNLOCKED_STAGES = [
  { stage: 1, total: 2, mastered: 0, isCompleted: false, isCurrent: true, isLocked: false },
  { stage: 2, total: 2, mastered: 0, isCompleted: false, isCurrent: false, isLocked: true },
  { stage: 3, total: 2, mastered: 0, isCompleted: false, isCurrent: false, isLocked: true },
];

function baseState(over: Record<string, unknown> = {}) {
  return {
    stages: [], overallPct: 0, child: { grade: 1 },
    isLoading: false, isError: false, error: null, refetch: refetchMock,
    ...over,
  };
}

function renderMap() {
  return render(
    <MemoryRouter>
      <QuestMap />
    </MemoryRouter>
  );
}

describe('QuestMap loading and error states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    masteryState = baseState();
  });

  it('shows a loading state instead of a map of locked checkpoints', () => {
    masteryState = baseState({ isLoading: true });
    renderMap();

    expect(screen.getByText(/kaart wordt geladen/i)).toBeTruthy();
    // The real map would have rendered all three stage names as locked buttons.
    expect(screen.queryByRole('button', { name: /jij bent hier/i })).toBeNull();
  });

  it('explains the failure instead of silently locking every checkpoint', () => {
    masteryState = baseState({ isError: true, error: new Error('PGRST202') });
    renderMap();

    expect(screen.getByText(/kon niet geladen worden/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /opnieuw proberen/i })).toBeTruthy();
  });

  it('retries the query when the parent asks it to', () => {
    masteryState = baseState({ isError: true, error: new Error('PGRST202') });
    renderMap();

    fireEvent.click(screen.getByRole('button', { name: /opnieuw proberen/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('offers a way out rather than stranding the child on a dead map', () => {
    masteryState = baseState({ isError: true, error: new Error('PGRST202') });
    renderMap();

    fireEvent.click(screen.getByRole('button', { name: /terug naar start/i }));
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });

  it('renders the map and navigates on click once stages load', async () => {
    masteryState = baseState({ stages: UNLOCKED_STAGES, overallPct: 0 });
    const { container } = renderMap();

    expect(screen.queryByText(/kaart wordt geladen/i)).toBeNull();
    expect(screen.queryByText(/kon niet geladen worden/i)).toBeNull();

    // Stage 1 is unlocked and current, so its checkpoint must actually navigate.
    const checkpointButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.className.includes('rounded-full') && b.querySelector('span')
    );
    expect(checkpointButtons.length).toBeGreaterThan(0);

    fireEvent.click(checkpointButtons[checkpointButtons.length - 1]);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1'));
  });
});

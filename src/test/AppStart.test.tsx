import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Player } from '@/hooks/usePlayers';
import { setPlayingChildId } from '@/lib/playingChild';
import { schoolYear } from '@/lib/buddy/species';

// `/app` only redirects. Judged on where it sends the child.

let playersFixture: Player[] = [];
vi.mock('@/hooks/usePlayers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/usePlayers')>();
  return { ...actual, usePlayers: () => ({ data: playersFixture, isLoading: false, refetch: vi.fn() }) };
});

let childFixture: { id: string } | null | undefined = null;
// Extra query state for the failure cases (error, paused while offline).
let childQueryState: Record<string, unknown> = {};
const refetchChild = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => ({ data: childFixture, isLoading: false, refetch: refetchChild, ...childQueryState }),
}));

let buddyFixture: { species_school_year: number | null } | undefined;
vi.mock('@/hooks/useBuddy', () => ({ useBuddyRow: () => ({ data: buddyFixture, isError: false }) }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'parent-1' } }) }));

import { AppStart } from '@/screens/AppStart';

const player = (id: string, paused = false): Player => ({ id, name: id, species: null, paused });

function renderStart() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<AppStart />} />
        {['add-child', 'wie-speelt-er', 'kies-je-buddy', 'home'].map(p => (
          <Route key={p} path={`/app/${p}`} element={<p>{p}</p>} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

describe('AppStart', () => {
  beforeEach(() => {
    setPlayingChildId('parent-1', null);
    playersFixture = [player('child-1')];
    childFixture = { id: 'child-1' };
    buddyFixture = { species_school_year: schoolYear(new Date()) };
    childQueryState = {};
  });

  it('offers a retry instead of "kind toevoegen" when the child could not be loaded', () => {
    childFixture = undefined;
    childQueryState = { isError: true, fetchStatus: 'idle' };
    renderStart();
    expect(screen.queryByText('add-child')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Opnieuw proberen' }).click();
    expect(refetchChild).toHaveBeenCalled();
  });

  it('offers a retry instead of "kind toevoegen" while offline', () => {
    // Offline React Query pauses the request: not loading, no error, no data.
    childFixture = undefined;
    childQueryState = { isError: false, fetchStatus: 'paused' };
    renderStart();
    expect(screen.queryByText('add-child')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opnieuw proberen' })).toBeInTheDocument();
  });

  it('sends a parent without children to add one', () => {
    playersFixture = [];
    childFixture = null;
    renderStart();
    expect(screen.getByText('add-child')).toBeInTheDocument();
  });

  it('goes straight to the Buddy for an only child', () => {
    renderStart();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('asks "Wie speelt er?" when several children can play and this device does not know who', () => {
    playersFixture = [player('child-1'), player('child-2')];
    renderStart();
    expect(screen.getByText('wie-speelt-er')).toBeInTheDocument();
  });

  it('does not ask when the other children are paused', () => {
    playersFixture = [player('child-1'), player('child-2', true)];
    renderStart();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('skips the question once this device remembers a child', () => {
    playersFixture = [player('child-1'), player('child-2')];
    setPlayingChildId('parent-1', 'child-2');
    renderStart();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('lets a child that never chose a Buddy choose one first', () => {
    buddyFixture = { species_school_year: null };
    renderStart();
    expect(screen.getByText('kies-je-buddy')).toBeInTheDocument();
  });
});

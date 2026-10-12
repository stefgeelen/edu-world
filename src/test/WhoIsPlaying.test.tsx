import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { needsPlayerPick, type Player } from '@/hooks/usePlayers';
import { getPlayingChildId, setPlayingChildId } from '@/lib/playingChild';

// "Wie speelt er?": each child taps their own Buddy; this device remembers it.
// Judged on what the child sees and where a tap leads.

let playersFixture: Player[] | undefined;
vi.mock('@/hooks/usePlayers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/usePlayers')>();
  return { ...actual, usePlayers: () => ({ data: playersFixture, isLoading: false }) };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'parent-1' } }) }));

import { WhoIsPlaying } from '@/screens/WhoIsPlaying';

const LIEN: Player = { id: 'child-1', name: 'Lien', species: 'vosje', paused: false };
const BRAM: Player = { id: 'child-2', name: 'Bram', species: null, paused: false };
const NOOR: Player = { id: 'child-3', name: 'Noor', species: 'loeka', paused: true };

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/app/wie-speelt-er']}>
      <Routes>
        <Route path="/app/wie-speelt-er" element={<WhoIsPlaying />} />
        <Route path="/app" element={<p>start</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WhoIsPlaying', () => {
  beforeEach(() => {
    setPlayingChildId('parent-1', null);
    playersFixture = [LIEN, BRAM, NOOR];
  });

  it("shows every child with their own Buddy, and a question mark for one that still has to choose", () => {
    const { container } = renderScreen();
    expect(screen.getByText('Wie speelt er?')).toBeInTheDocument();
    expect(screen.getByText('met Vosje')).toBeInTheDocument();
    expect(screen.getByText('Kies je Buddy!')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'));
    expect(srcs.some(s => s?.includes('vosje-happy'))).toBe(true);
  });

  it('remembers the tapped child on this device and goes on through the start', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Bram' }));
    expect(getPlayingChildId('parent-1')).toBe('child-2');
    expect(screen.getByText('start')).toBeInTheDocument();
  });

  it('shows a paused child locked, and tapping it does nothing', () => {
    renderScreen();
    const noor = screen.getByRole('button', { name: 'Noor, gepauzeerd' });
    expect(noor).toBeDisabled();
    expect(screen.getByText('Gepauzeerd')).toBeInTheDocument();
    fireEvent.click(noor);
    expect(getPlayingChildId('parent-1')).toBeNull();
  });

  it('goes back to the start when there are no children', () => {
    playersFixture = [];
    renderScreen();
    expect(screen.getByText('start')).toBeInTheDocument();
  });
});

describe('needsPlayerPick', () => {
  it('never asks with only one child that can play', () => {
    expect(needsPlayerPick([LIEN], null)).toBe(false);
    expect(needsPlayerPick([LIEN, NOOR], null)).toBe(false);
  });

  it('asks with several playable children and nothing remembered', () => {
    expect(needsPlayerPick([LIEN, BRAM], null)).toBe(true);
  });

  it('does not ask again once a playable child is remembered', () => {
    expect(needsPlayerPick([LIEN, BRAM], 'child-2')).toBe(false);
  });

  it('asks again when the remembered child is paused or gone', () => {
    expect(needsPlayerPick([LIEN, BRAM, NOOR], 'child-3')).toBe(true);
    expect(needsPlayerPick([LIEN, BRAM], 'removed-child')).toBe(true);
  });
});

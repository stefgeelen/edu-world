import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestQueryClient, queryWrapper } from './testUtils';

// The child picks a Buddy the first time, and once per school year after that
// (stay or swap). Judged on what the child sees and what gets sent.

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: { id: 'child-1', name: 'Mila' } }) }));

let buddyRow: { species: string; species_school_year: number | null } | undefined;
vi.mock('@/hooks/useBuddy', () => ({ useBuddyRow: () => ({ data: buddyRow, isLoading: false }) }));

const speak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak }) }));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { ChooseBuddy } from '@/screens/ChooseBuddy';
import { schoolYear } from '@/lib/buddy/species';

function renderScreen() {
  const Wrapper = queryWrapper(createTestQueryClient());
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={['/app/kies-je-buddy']}>
        <Routes>
          <Route path="/app/kies-je-buddy" element={<ChooseBuddy />} />
          <Route path="/app/home" element={<p>Kamer van de Buddy</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

const thisYear = schoolYear(new Date());

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  speak.mockReset();
  toastError.mockReset();
});

describe('ChooseBuddy — first time', () => {
  beforeEach(() => {
    buddyRow = { species: 'nootje', species_school_year: null };
  });

  it('shows all four Buddies, none picked yet', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Wie komt er bij jou wonen?' })).toBeInTheDocument();
    for (const name of ['Nootje', 'Vosje', 'Prikkel', 'Loeka']) {
      expect(screen.getByRole('radio', { name: new RegExp(name) })).toHaveAttribute('aria-checked', 'false');
    }
    expect(screen.getByRole('button', { name: 'Kies een Buddy' })).toBeDisabled();
  });

  it('tapping a Buddy lets it introduce itself out loud', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('radio', { name: /Vosje/ }));
    expect(screen.getByRole('radio', { name: /Vosje/ })).toHaveAttribute('aria-checked', 'true');
    expect(speak).toHaveBeenCalledWith(expect.stringContaining('Ik ben Vosje'));
    expect(screen.getByText(/Ik ben Vosje/)).toBeInTheDocument();
  });

  it('confirming saves the choice and goes to the Buddy', async () => {
    renderScreen();
    fireEvent.click(screen.getByRole('radio', { name: /Loeka/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Loeka!' }));
    await waitFor(() => expect(screen.getByText('Kamer van de Buddy')).toBeInTheDocument());
    expect(rpc).toHaveBeenCalledWith('buddy_choose', { p_child_id: 'child-1', p_species: 'loeka' });
  });

  it('stays on the screen with a message when saving fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Buddy already chosen this school year' } });
    renderScreen();
    fireEvent.click(screen.getByRole('radio', { name: /Prikkel/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Prikkel!' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByText('Kamer van de Buddy')).not.toBeInTheDocument();
  });
});

describe('ChooseBuddy — new school year', () => {
  beforeEach(() => {
    buddyRow = { species: 'prikkel', species_school_year: thisYear - 1 };
  });

  it('has the current Buddy ready, so staying is one tap', async () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Een nieuw schooljaar!' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Prikkel/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Jouw Buddy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ik blijf bij Prikkel!' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('buddy_choose', { p_child_id: 'child-1', p_species: 'prikkel' }));
  });

  it('can swap to another Buddy', async () => {
    renderScreen();
    fireEvent.click(screen.getByRole('radio', { name: /Nootje/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Nootje!' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('buddy_choose', { p_child_id: 'child-1', p_species: 'nootje' }));
  });
});

describe('ChooseBuddy — nothing to choose', () => {
  it('goes straight to the Buddy when it already chose this school year', () => {
    buddyRow = { species: 'vosje', species_school_year: thisYear };
    renderScreen();
    expect(screen.getByText('Kamer van de Buddy')).toBeInTheDocument();
  });
});

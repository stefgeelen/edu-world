import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminExerciseFamily: the Test / Live switch. Test = only admins see the
// exercise (exercises.admin_only, enforced server-side); it is always set for
// every row of the family at once.

const rows = (adminOnly: boolean) => [
  { id: 'ex-1', title: 'Nieuw', route: '/exercises/new/1', subject: 'math', grade: 2, stage: 'stage-1', display_order: 1, xp_reward: 20, is_active: true, admin_only: adminOnly, config: null },
  { id: 'ex-2', title: 'Nieuw', route: '/exercises/new/2', subject: 'math', grade: 2, stage: 'stage-2', display_order: 1, xp_reward: 20, is_active: true, admin_only: adminOnly, config: null },
];

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminExerciseFamily } from '@/screens/admin/AdminExerciseFamily';

let updateSpy: ReturnType<typeof vi.fn>;
let likeSpy: ReturnType<typeof vi.fn>;

function mockRows(adminOnly: boolean) {
  updateSpy = vi.fn();
  likeSpy = vi.fn();
  fromMock.mockImplementation(() => {
    const chain = fakeSupabaseChain({ data: rows(adminOnly), error: null }) as Record<string, unknown>;
    chain.update = (values: unknown) => { updateSpy(values); return chain; };
    chain.like = (column: string, pattern: string) => { likeSpy(column, pattern); return chain; };
    return chain;
  });
}

function renderScreen() {
  const Wrapper = queryWrapper(createTestQueryClient());
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/admin/exercises/${encodeURIComponent('/exercises/new')}`]}>
        <Routes>
          <Route path="/admin/exercises/:familyKey" element={<AdminExerciseFamily />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  );
}

describe('AdminExerciseFamily — Test / Live', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows a family in test as such, and puts it live for every row at once', async () => {
    mockRows(true);
    renderScreen();
    const test = await screen.findByRole('button', { name: /Test \(enkel admins\)/ });
    expect(test).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Enkel admins zien deze oefening/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Live \(iedereen\)/ }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ admin_only: false }));
    expect(likeSpy).toHaveBeenCalledWith('route', '/exercises/new/%');
    expect(window.confirm).toHaveBeenCalled();
  });

  it('puts a live family back in test', async () => {
    mockRows(false);
    renderScreen();
    const live = await screen.findByRole('button', { name: /Live \(iedereen\)/ });
    expect(live).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Test \(enkel admins\)/ }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ admin_only: true }));
  });

  it('changes nothing when the admin cancels', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mockRows(false);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Test \(enkel admins\)/ }));
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

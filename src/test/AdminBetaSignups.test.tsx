import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminBetaSignups is a read-only table + CSV export. No mutation, so the
// coverage here is: loading, error, rendered rows (incl. null-field
// fallbacks), empty state (export disabled), and the export action itself.

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { AdminBetaSignups } from '@/screens/admin/AdminBetaSignups';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminBetaSignups /></Wrapper>);
}

const SIGNUP_1 = {
  id: 'signup-1',
  email: 'parent1@example.test',
  full_name: 'Test Parent One',
  child_grade: '3',
  source: 'social',
  created_at: '2026-01-05T10:00:00Z',
};
const SIGNUP_2 = {
  id: 'signup-2',
  email: 'parent2@example.test',
  full_name: null,
  child_grade: null,
  source: null,
  created_at: '2026-01-06T10:00:00Z',
};

describe('AdminBetaSignups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while the signups are being fetched', () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: null, error: null }));
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows an error message when the query fails', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: null, error: new Error('db down') }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Fout bij laden van beta-aanmeldingen.')).toBeInTheDocument());
  });

  it('renders signup rows, falling back to "—" for null optional fields', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: [SIGNUP_1, SIGNUP_2], error: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('2 aanmeldingen')).toBeInTheDocument());
    expect(screen.getByText('parent1@example.test')).toBeInTheDocument();
    expect(screen.getByText('Test Parent One')).toBeInTheDocument();

    const row2 = screen.getByText('parent2@example.test').closest('tr') as HTMLElement;
    expect(row2.textContent).toMatch(/—/);
  });

  it('shows the empty state and disables export when there are no signups', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: [], error: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Nog geen aanmeldingen.')).toBeInTheDocument());
    expect(screen.getByText('Export CSV').closest('button')).toBeDisabled();
  });

  describe('CSV export', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();

    beforeEach(() => {
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;
    });

    afterEach(() => {
      clickSpy.mockClear();
      createObjectURLMock.mockClear();
      revokeObjectURLMock.mockClear();
    });

    it('builds a CSV blob and triggers a download when "Export CSV" is clicked', async () => {
      fromMock.mockReturnValue(fakeSupabaseChain({ data: [SIGNUP_1], error: null }));
      renderScreen();
      await waitFor(() => expect(screen.getByText('1 aanmelding')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Export CSV'));

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blob = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8;');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminBetaSignups is the waiting list table + CSV export, plus "Toegang
// geven": the admin puts an email on the list so that address can sign up.

const fromMock = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    info: (...a: unknown[]) => toastInfo(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

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

  it('counts signups per campaign, older ones without a campaign as "website"', async () => {
    const fromInstagram = { ...SIGNUP_1, id: 'signup-3', email: 'parent3@example.test', source: 'instagram · hero' };
    const fromInstagram2 = { ...SIGNUP_1, id: 'signup-4', email: 'parent4@example.test', source: 'instagram · footer' };
    fromMock.mockReturnValue(fakeSupabaseChain({ data: [SIGNUP_1, SIGNUP_2, fromInstagram, fromInstagram2], error: null }));
    renderScreen();

    const summary = await screen.findByLabelText('Aanmeldingen per bron');
    expect(summary.textContent).toBe('website2instagram2');
  });

  it('shows the empty state and disables export when there are no signups', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: [], error: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Nog geen aanmeldingen.')).toBeInTheDocument());
    expect(screen.getByText('Export CSV').closest('button')).toBeDisabled();
  });

  describe('CSV export', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURLMock = vi.fn((_blob: Blob) => 'blob:mock-url');
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

  describe('Toegang geven', () => {
    function chainWithInsert(insertResult: { data: null; error: unknown }) {
      const insertSpy = vi.fn();
      fromMock.mockImplementation(() => {
        const chain = fakeSupabaseChain({ data: [SIGNUP_1], error: null });
        chain.insert = (row: unknown) => {
          insertSpy(row);
          return fakeSupabaseChain(insertResult);
        };
        return chain;
      });
      return insertSpy;
    }

    it('keeps the button disabled until a valid email is typed', async () => {
      chainWithInsert({ data: null, error: null });
      renderScreen();
      await screen.findByText('1 aanmelding');

      const button = screen.getByRole('button', { name: /Toegang geven/ });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: 'geen-adres' } });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: 'nieuw@example.test' } });
      expect(button).toBeEnabled();
    });

    it('puts the email (lowercased) on the list with source "admin · toegang"', async () => {
      const insertSpy = chainWithInsert({ data: null, error: null });
      renderScreen();
      await screen.findByText('1 aanmelding');

      fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: '  Nieuw@Example.test ' } });
      fireEvent.click(screen.getByRole('button', { name: /Toegang geven/ }));

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(insertSpy).toHaveBeenCalledWith({ email: 'nieuw@example.test', source: 'admin · toegang' });
      expect(screen.getByLabelText('E-mailadres')).toHaveValue('');
    });

    it('says the address already has access when it is on the list', async () => {
      chainWithInsert({ data: null, error: { code: '23505', message: 'duplicate' } });
      renderScreen();
      await screen.findByText('1 aanmelding');

      fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: 'parent1@example.test' } });
      fireEvent.click(screen.getByRole('button', { name: /Toegang geven/ }));

      await waitFor(() => expect(toastInfo).toHaveBeenCalled());
      expect(toastError).not.toHaveBeenCalled();
    });

    it('shows an error toast when saving fails', async () => {
      chainWithInsert({ data: null, error: { code: '42501', message: 'denied' } });
      renderScreen();
      await screen.findByText('1 aanmelding');

      fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: 'nieuw@example.test' } });
      fireEvent.click(screen.getByRole('button', { name: /Toegang geven/ }));

      await waitFor(() => expect(toastError).toHaveBeenCalled());
    });
  });

  describe('Verwijderen', () => {
    function chainWithDelete(deleteResult: { data: unknown; error: unknown }) {
      const deleteSpy = vi.fn();
      fromMock.mockImplementation(() => {
        const chain = fakeSupabaseChain({ data: [SIGNUP_1, SIGNUP_2], error: null });
        chain.delete = () => {
          const del = fakeSupabaseChain(deleteResult);
          del.eq = (col: unknown, val: unknown) => {
            deleteSpy(col, val);
            return del;
          };
          return del;
        };
        return chain;
      });
      return deleteSpy;
    }

    async function openDialogFor(email: string) {
      renderScreen();
      await screen.findByText('2 aanmeldingen');
      fireEvent.click(screen.getByRole('button', { name: `${email} verwijderen` }));
      return screen.findByRole('alertdialog');
    }

    it('asks for confirmation before deleting anything', async () => {
      const deleteSpy = chainWithDelete({ data: [{ id: 'signup-1' }], error: null });
      const dialog = await openDialogFor('parent1@example.test');

      expect(dialog.textContent).toContain('parent1@example.test');
      fireEvent.click(screen.getByRole('button', { name: 'Annuleren' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('deletes the chosen row after confirming', async () => {
      const deleteSpy = chainWithDelete({ data: [{ id: 'signup-2' }], error: null });
      await openDialogFor('parent2@example.test');

      fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Van de wachtlijst gehaald.'));
      expect(deleteSpy).toHaveBeenCalledWith('id', 'signup-2');
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('shows an error when nothing was deleted (silent RLS denial)', async () => {
      chainWithDelete({ data: [], error: null });
      await openDialogFor('parent1@example.test');

      fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(toastSuccess).not.toHaveBeenCalled();
    });
  });
});

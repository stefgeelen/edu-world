import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// BetaSignupForm puts an email on the waiting list and then asks the
// beta-signup-confirmation function to send the confirmation mail.

const insertMock = vi.fn();
const invokeMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: (...a: unknown[]) => insertMock(...a) }),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { BetaSignupForm } from '@/components/beta/BetaSignupForm';

function submit(email: string) {
  render(<MemoryRouter><BetaSignupForm source="hero" /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: /Schrijf me in/ }));
}

describe('BetaSignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock.mockResolvedValue({ data: { sent: true }, error: null });
  });

  it('asks for the confirmation mail after a new signup', async () => {
    insertMock.mockResolvedValue({ error: null });
    submit('  Ouder@Example.TEST ');

    await screen.findByText('Je bent erbij!');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'ouder@example.test' }));
    expect(invokeMock).toHaveBeenCalledWith('beta-signup-confirmation', {
      body: { email: 'ouder@example.test' },
    });
  });

  it('sends no second mail when the address is already on the list', async () => {
    insertMock.mockResolvedValue({ error: { code: '23505' } });
    submit('ouder@example.test');

    await screen.findByText('Je bent erbij!');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('still shows success when the mail fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockResolvedValue({ error: null });
    invokeMock.mockResolvedValue({ data: null, error: new Error('brevo down') });
    submit('ouder@example.test');

    await screen.findByText('Je bent erbij!');
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('sends no mail when the signup itself fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockResolvedValue({ error: { code: '500' } });
    submit('ouder@example.test');

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

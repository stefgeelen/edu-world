import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { Auth } from '@/screens/Auth';

// Auth.tsx is the very first screen a user hits (CLAUDE.md: "Auth flow" has zero
// tests). It has its own hand-rolled validation instead of the Zod schema used
// elsewhere in the app, which is exactly the kind of inconsistency worth
// guarding with tests.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const signIn = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();
let currentUser: unknown = null;
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ signIn, signUp, signInWithOAuth, user: currentUser }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
}

function getForm(container: HTMLElement) {
  return container.querySelector('form') as HTMLFormElement;
}

// The login tab button and the login submit button both render the exact text
// "Inloggen", so `getByRole('button', { name: /inloggen/i })` is ambiguous.
// Target the submit button by type instead.
function getSubmitButton(container: HTMLElement) {
  return container.querySelector('button[type="submit"]') as HTMLButtonElement;
}

describe('Auth screen', () => {
  afterEach(() => {
    vi.clearAllMocks();
    currentUser = null;
  });

  it('disables submit until email and password are both valid (login mode)', () => {
    const { container } = renderAuth();
    const submit = getSubmitButton(container);
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: 'parent@example.com' } });
    expect(submit).toBeDisabled(); // still no password

    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'anything' } });
    expect(submit).toBeEnabled();
  });

  it('signs in with the trimmed email and password, then navigates to /app', async () => {
    signIn.mockResolvedValue({ error: null });
    const { container } = renderAuth();

    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: '  parent@example.com  ' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'MyPassword1' } });
    fireEvent.click(getSubmitButton(container));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('parent@example.com', 'MyPassword1'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app', { replace: true }));
  });

  it('shows a mapped error toast and does not navigate when sign-in fails', async () => {
    signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { container } = renderAuth();

    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: 'parent@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'wrongpassword' } });
    fireEvent.click(getSubmitButton(container));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Verkeerd e-mailadres of wachtwoord.'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email client-side without ever calling signIn', () => {
    const { container } = renderAuth();
    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'MyPassword1' } });

    // Submit button stays disabled, but the form itself is still submittable
    // (e.g. via Enter key) — this exercises the same guard clause.
    fireEvent.submit(getForm(container));

    expect(toast.error).toHaveBeenCalledWith('Vul een geldig e-mailadres in.');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('switching to signup mode requires a full name and a stronger password', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Registreren' }));

    expect(screen.getByPlaceholderText('Volledige naam')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /account aanmaken/i });
    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: 'parent@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'short1' } }); // too short/weak
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Volledige naam'), { target: { value: 'Stef Geelen' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'StrongPassword1' } });
    expect(submit).toBeEnabled();
  });

  it('shows live password requirement checks while typing in signup mode', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Registreren' }));

    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'short' } });
    expect(screen.getByText('Minimaal 10 tekens').previousSibling).toBeTruthy();
    // Weak password: none of the requirements satisfied except possibly lowercase
    expect(screen.getByText('Minimaal één cijfer').closest('li')?.querySelector('svg')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'StrongPassword1' } });
    // Every requirement should now render its checkmark icon
    ['Minimaal 10 tekens', 'Minimaal één hoofdletter', 'Minimaal één kleine letter', 'Minimaal één cijfer'].forEach((text) => {
      expect(screen.getByText(text).closest('li')?.querySelector('svg')).not.toBeNull();
    });
  });

  it('signs up and redirects straight into mandatory PIN setup', async () => {
    signUp.mockResolvedValue({ error: null });
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Registreren' }));

    fireEvent.change(screen.getByPlaceholderText('Volledige naam'), { target: { value: 'Stef Geelen' } });
    fireEvent.change(screen.getByPlaceholderText('E-mailadres'), { target: { value: 'parent@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Wachtwoord'), { target: { value: 'StrongPassword1' } });
    fireEvent.click(screen.getByRole('button', { name: /account aanmaken/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('parent@example.com', 'StrongPassword1', 'Stef Geelen'));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/auth/setup-pin?redirect=/app/add-child', { replace: true })
    );
  });

  it('redirects an already-logged-in user straight to /app', () => {
    currentUser = { id: 'user-1' };
    renderAuth();
    expect(navigateMock).toHaveBeenCalledWith('/app', { replace: true });
  });
});

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { ChildReadingTheme } from '@/hooks/useReadingTheme';
import { createTestQueryClient, queryWrapper } from '@/test/testUtils';

let themeMock: ChildReadingTheme | undefined;
vi.mock('@/hooks/useReadingTheme', () => ({
  useChildReadingTheme: () => ({ data: themeMock }),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'parent-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const updateSpy = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (values: unknown) => {
        updateSpy(values);
        const chain = { eq: () => chain, then: (ok: (r: { error: null }) => void) => ok({ error: null }) };
        return chain;
      },
    }),
  },
}));

import { ReadingThemeCard } from '@/components/parent/ReadingThemeCard';

function renderCard(grade = 1) {
  const Wrapper = queryWrapper(createTestQueryClient());
  return render(<Wrapper><ReadingThemeCard childId="c1" childName="Lotte" grade={grade} /></Wrapper>);
}

describe('ReadingThemeCard (parent portal)', () => {
  afterEach(() => {
    cleanup();
    updateSpy.mockClear();
    themeMock = undefined;
  });

  it('follows the calendar by default and says which theme that is', () => {
    themeMock = { theme: 2, calendarTheme: 2, chosenTheme: null };
    renderCard();
    expect(screen.getByText('Thema 2 van 10')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('kalender');
    expect(screen.getByRole('option', { name: 'Volgt de kalender (nu: thema 2)' })).toBeInTheDocument();
  });

  it('saves the theme the parent picks, and back to the calendar', async () => {
    themeMock = { theme: 2, calendarTheme: 2, chosenTheme: null };
    renderCard();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ reading_theme: 4 }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'kalender' } });
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ reading_theme: null }));
  });

  it('is only there in the 1ste leerjaar', () => {
    themeMock = { theme: 10, calendarTheme: 2, chosenTheme: null };
    const { container } = renderCard(2);
    expect(container).toBeEmptyDOMElement();
  });
});

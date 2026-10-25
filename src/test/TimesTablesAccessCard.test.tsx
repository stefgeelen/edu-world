import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { TimesTableAccess } from '@/hooks/useTimesTables';
import { createTestQueryClient, queryWrapper } from '@/test/testUtils';

let accessMock: TimesTableAccess | undefined;
vi.mock('@/hooks/useTimesTables', () => ({
  useTimesTableAccess: () => ({ data: accessMock }),
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

import { TimesTablesAccessCard } from '@/components/parent/TimesTablesAccessCard';

const SCHEDULE: TimesTableAccess['schedule'] = [
  { table: 2, kind: 'multiply', month: 10, day: 1 },
  { table: 2, kind: 'divide', month: 1, day: 4 },
  { table: 4, kind: 'multiply', month: 1, day: 25 },
  { table: 4, kind: 'divide', month: 3, day: 1 },
];

function renderCard(grade = 2) {
  const Wrapper = queryWrapper(createTestQueryClient());
  return render(<Wrapper><TimesTablesAccessCard childId="c1" childName="Lotte" grade={grade} /></Wrapper>);
}

describe('TimesTablesAccessCard (parent portal, Leerstof)', () => {
  afterEach(() => {
    cleanup();
    updateSpy.mockClear();
    accessMock = undefined;
  });

  it('shows what the calendar opened, what the parent opened, and when the rest opens', () => {
    accessMock = { multiply: [2, 4], divide: [], extraMultiply: [4], extraDivide: [], schedule: SCHEDULE };
    renderCard();
    expect(screen.getByLabelText('Maaltafel van 2: open sinds 1 okt')).toBeDisabled();
    expect(screen.getByLabelText('Maaltafel van 4: door jou opengezet')).toBeEnabled();
    expect(screen.getByLabelText('Deeltafel van 2: open vanaf 4 jan')).toBeEnabled();
  });

  it('opens a deeltafel on its own, and closes what the parent opened', async () => {
    accessMock = { multiply: [2, 4], divide: [], extraMultiply: [4], extraDivide: [], schedule: SCHEDULE };
    renderCard();
    fireEvent.click(screen.getByLabelText('Deeltafel van 4: open vanaf 1 mrt'));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ extra_times_tables: [4], extra_division_tables: [4] }));

    fireEvent.click(screen.getByLabelText('Maaltafel van 4: door jou opengezet'));
    await waitFor(() => expect(updateSpy).toHaveBeenLastCalledWith({ extra_times_tables: [], extra_division_tables: [] }));
  });

  it('is only there in the 2de leerjaar', () => {
    accessMock = { multiply: [], divide: [], extraMultiply: [], extraDivide: [], schedule: SCHEDULE };
    const { container } = renderCard(1);
    expect(container).toBeEmptyDOMElement();
  });
});

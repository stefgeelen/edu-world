import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { TableProgress } from '@/hooks/useTimesTables';

let progressMock: Record<number, TableProgress> = {};
vi.mock('@/hooks/useTimesTables', () => ({
  useTimesTables: () => ({ data: progressMock, isLoading: false }),
}));

import { TimesTablesCard } from '@/components/parent/TimesTablesCard';

describe('TimesTablesCard (parent portal)', () => {
  afterEach(() => {
    cleanup();
    progressMock = {};
  });

  it('shows per table: known, how far along, or not yet', () => {
    progressMock = {
      5: { table: 5, runs: 3, flawlessRuns: 3, sticker: true },
      2: { table: 2, runs: 4, flawlessRuns: 1, sticker: false },
    };
    render(<TimesTablesCard childId="c1" grade={2} />);
    expect(screen.getByText('1 van 10 gekend')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 5: gekend')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 2: 1/3 foutloos')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 7: nog niet')).toBeInTheDocument();
  });

  it('stays hidden in the 1ste leerjaar until a table was practised', () => {
    const { container } = render(<TimesTablesCard childId="c1" grade={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

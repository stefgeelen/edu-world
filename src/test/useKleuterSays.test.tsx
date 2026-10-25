import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

let childFixture: { id: string; grade: number } | undefined;
vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: childFixture }) }));
const speak = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ stopSpeaking: vi.fn(), useSpeech: () => ({ speak }) }));
vi.mock('@/hooks/useAdminRole', () => ({ useAdminRole: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { useIsKleuter, useKleuterSays } from '@/hooks/useKindergarten';
import { resetSpoken } from '@/lib/spokenOnce';

// Een kleuter kan niet lezen: buiten de oefeningen zegt de Buddy wat er staat.

describe('useKleuterSays', () => {
  beforeEach(() => {
    speak.mockClear();
    resetSpoken();
  });

  it('says the text to a kleuter, once per session for the same sentence', () => {
    childFixture = { id: 'k1', grade: 0 };
    const { rerender } = renderHook(({ text }) => useKleuterSays('dashboard', text), { initialProps: { text: 'Hallo, Lien!' } });
    expect(speak).toHaveBeenCalledWith('Hallo, Lien!');
    rerender({ text: 'Hallo, Lien!' });
    renderHook(() => useKleuterSays('dashboard', 'Hallo, Lien!'));
    expect(speak).toHaveBeenCalledTimes(1);
    rerender({ text: 'Al mijn wensen zijn vervuld!' });
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('stays quiet for a child that can read', () => {
    childFixture = { id: 'c1', grade: 1 };
    renderHook(() => useKleuterSays('dashboard', 'Hallo!'));
    expect(speak).not.toHaveBeenCalled();
  });

  it('knows who is a kleuter', () => {
    childFixture = { id: 'k1', grade: 0 };
    expect(renderHook(() => useIsKleuter()).result.current).toBe(true);
    childFixture = { id: 'c1', grade: 2 };
    expect(renderHook(() => useIsKleuter()).result.current).toBe(false);
  });
});

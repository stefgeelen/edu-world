import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GradeChoice } from '@/components/GradeChoice';
import { getGradeAssignment } from '@/lib/gradeFromAge';

describe('GradeChoice', () => {
  it('does not offer the 3de kleuterklas while it is closed to this parent', () => {
    render(<GradeChoice assignment={getGradeAssignment(6)} chosen={null} onChoose={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: '3de kleuterklas' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1ste leerjaar' })).toHaveAttribute('aria-checked', 'true');
  });

  it('offers it first when open, and selects it for a child of 5', () => {
    const onChoose = vi.fn();
    render(<GradeChoice assignment={getGradeAssignment(5, true)} chosen={null} onChoose={onChoose} kindergartenOpen />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAccessibleName('3de kleuterklas');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: '1ste leerjaar' }));
    expect(onChoose).toHaveBeenCalledWith(1);
  });
});

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';

// Een kleuter herkent een oefening aan het prentje, niet aan de naam.

describe('ExerciseTypeIcon', () => {
  it('shows a picture for the kleuter exercises', () => {
    const { container } = render(<ExerciseTypeIcon typeKey="/exercises/blend" subject="reading" />);
    expect(container.textContent).toBe('👂');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('keeps the icon for the other exercises', () => {
    const { container } = render(<ExerciseTypeIcon typeKey="/exercises/clock" subject="math" />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

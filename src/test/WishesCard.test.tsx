import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

let menuFixture: unknown;
vi.mock('@/hooks/usePracticeMenu', () => ({ usePracticeMenu: () => ({ data: menuFixture }) }));

import { WishesCard } from '@/components/buddy/WishesCard';

const renderCard = () =>
  render(
    <MemoryRouter>
      <WishesCard buddyName="Nootje" />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  menuFixture = {
    wish_bonus: 5,
    full_munten: 8,
    exercises: [],
    wishes: [{ type_key: '/exercises/clock', title: 'Klok lezen', subject: 'math', route: '/exercises/clock/2', fulfilled: false }],
  };
});

describe('WishesCard', () => {
  it('starts the wished exercise straight away when tapped', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Klok lezen/ }));
    expect(navigateMock).toHaveBeenCalledWith('/app/exercises/clock/2');
  });

  it('renders nothing without wishes, e.g. before the menu loads', () => {
    menuFixture = undefined;
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });
});

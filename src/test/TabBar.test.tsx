import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

import { TabBar } from '@/components/TabBar';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar />
    </MemoryRouter>
  );

describe('TabBar', () => {
  it('has exactly two tabs: the Buddy and the dashboard', () => {
    renderAt('/app/home');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Buddy', 'Dashboard']);
  });

  it.each([
    ['/app/home', 'Buddy'],
    ['/app/shop', 'Buddy'],
    ['/app/dashboard', 'Dashboard'],
    ['/app/oefenen', 'Dashboard'],
    ['/app/badges/legend', 'Dashboard'],
  ])('lights up the right tab on %s', (path, tab) => {
    renderAt(path);
    expect(screen.getByRole('button', { name: tab })).toHaveAttribute('aria-current', 'page');
  });

  it('switches tabs', () => {
    renderAt('/app/home');
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });

  it.each(['/app', '/app/add-child', '/app/exercises/clock/1'])('stays out of the way on %s', (path) => {
    const { container } = renderAt(path);
    expect(container).toBeEmptyDOMElement();
  });
});

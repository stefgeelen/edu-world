import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

// Old screens are gone, but bookmarks and installed home-screen apps can still
// open their URLs. Each must land somewhere sensible instead of a blank page.

vi.mock('@/components/ProtectedRoute', () => ({ ProtectedRoute: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/components/Layout', () => ({ Layout: () => <Outlet /> }));
vi.mock('@/screens/BuddyRoom', () => ({ BuddyRoom: () => <p>Kamer van de Buddy</p> }));
vi.mock('@/screens/Practice', () => ({ Practice: () => <p>Kies een oefening</p> }));
vi.mock('@/screens/BuddyShop', () => ({ BuddyShop: () => <p>Winkel</p> }));

import { appRoutes } from '@/routes/appRoutes';

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="url">{pathname + search}</output>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>{appRoutes}</Routes>
      <Where />
    </MemoryRouter>
  );

describe('app routes', () => {
  it.each([
    ['/app/dashboard', '/app/home', 'Kamer van de Buddy'],
    ['/app/buddy-room', '/app/home', 'Kamer van de Buddy'],
    ['/app/progress', '/app/home', 'Kamer van de Buddy'],
    ['/app/map', '/app/oefenen', 'Kies een oefening'],
    ['/app/stage/fluisterbos/2', '/app/oefenen', 'Kies een oefening'],
  ])('sends the old %s to %s', async (from, to, text) => {
    renderAt(from);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'url' })).toHaveTextContent(to);
  });

  it('keeps the shop tab when an old shop link is opened', async () => {
    renderAt('/app/buddy-room/shop?cat=hygiene');
    expect(await screen.findByText('Winkel')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'url' })).toHaveTextContent('/app/shop?cat=hygiene');
  });

  it('serves the new home, practice list and shop directly', async () => {
    renderAt('/app/home');
    expect(await screen.findByText('Kamer van de Buddy')).toBeInTheDocument();
  });
});

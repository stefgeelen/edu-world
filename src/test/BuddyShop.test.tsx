import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// The shop is judged on what a young child can do without reading much: pick a
// kind of thing from big tabs, see how strong it is, confirm before coins are
// spent, and hand the bought item straight to the Buddy.

const buy = vi.fn();
let munten = 20;

vi.mock('@/hooks/useBuddy', () => ({
  useBuddy: () => ({
    buddy: { name: 'Nootje', munten, inventory: { bes: 1 } },
    buy,
    buyPending: false,
  }),
}));

import { BuddyShop } from '@/screens/BuddyShop';

/** Shows where "Geef aan Nootje" navigated to, and with which item. */
function RoomProbe() {
  const location = useLocation();
  return <p>room {JSON.stringify(location.state)}</p>;
}

const renderShop = (path = '/app/shop') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/shop" element={<BuddyShop />} />
        <Route path="/app/home" element={<RoomProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  munten = 20;
});

describe('BuddyShop', () => {
  it('opens on the food tab and switches kinds with the big tabs', () => {
    renderShop();
    expect(screen.getByRole('tab', { name: /Eten/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Bosbes/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Spelen/ }));
    expect(screen.getByRole('button', { name: /Mosbal/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bosbes/ })).not.toBeInTheDocument();
  });

  it('opens the tab the care dialog linked to', () => {
    renderShop('/app/shop?cat=hygiene');
    expect(screen.getByRole('tab', { name: /Wassen/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Bronbad/ })).toBeInTheDocument();
  });

  it('shows strength as one to three hearts', () => {
    renderShop();
    const strengths = ['Bosbes', 'Hazelnoot', 'Feesttaart'].map(
      (name) => within(screen.getByRole('button', { name: new RegExp(name) })).getByRole('img').getAttribute('aria-label')
    );
    expect(strengths).toEqual(['Kracht 1 van 3', 'Kracht 2 van 3', 'Kracht 3 van 3']);
  });

  it('asks before spending coins, then offers to give the item to the Buddy', () => {
    renderShop();
    fireEvent.click(screen.getByRole('button', { name: /Hazelnoot/ }));
    expect(buy).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Ja, kopen voor/ }));
    expect(buy).toHaveBeenCalledWith('noot', expect.any(Function));

    // The server confirms the purchase.
    const onBought = buy.mock.calls[0][1] as () => void;
    act(() => onBought());
    expect(within(screen.getByRole('dialog')).getByText(/Gekocht!/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Geef aan Nootje/ }));
    expect(screen.getByText(/room/)).toHaveTextContent('{"give":{"action":"feed","itemId":"noot"}}');
  });

  it('cancels without buying when the child says no', () => {
    renderShop();
    fireEvent.click(screen.getByRole('button', { name: /Hazelnoot/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nee' }));
    expect(buy).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains how many coins are missing instead of offering to buy', () => {
    renderShop();
    fireEvent.click(screen.getByRole('button', { name: /Feesttaart kost 25 Munten/ }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Je hebt nog 5 🪙 nodig.');
    expect(within(dialog).queryByRole('button', { name: /Ja, kopen/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Oefenen/ })).toHaveAttribute('href', '/app/oefenen');
  });
});

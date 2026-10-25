import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentChildren is the parent-portal landing screen: a React Query list of
// children joined with the parent's subscription (for the max-children gate).
// These tests cover the loading state, the rendered list, the empty state,
// the subscription-limit gate, and navigation into a child's detail screen.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' } }),
}));

let childrenData: unknown[] = [];
const rpcMock = vi.fn();
let subscriptionData: { plan: string; max_children: number; status: string } | null = { plan: 'family', max_children: 3, status: 'active' };

const fromMock = vi.fn((table: string) => {
  if (table === 'children') {
    return fakeSupabaseChain({ data: childrenData, error: null });
  }
  if (table === 'subscriptions') {
    return fakeSupabaseChain({ data: subscriptionData, error: null });
  }
  return fakeSupabaseChain({ data: null, error: null });
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...(args as [string])),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { ParentChildren } from '@/screens/parent/ParentChildren';

const CHILD_A = {
  id: 'child-1', name: 'Test Child A', age: 8, grade: 3,
  streak: 4, buddy_states: { species: 'loeka', species_school_year: 2026 },
};
const CHILD_B = {
  id: 'child-2', name: 'Test Child B', age: 6, grade: 1,
  streak: 0, buddy_states: null,
};

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(
    <MemoryRouter>
      <Wrapper><ParentChildren /></Wrapper>
    </MemoryRouter>
  );
}

describe('ParentChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    childrenData = [];
    subscriptionData = { plan: 'family', max_children: 3, status: 'active' };
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  it('shows a loading indicator before the children query resolves', () => {
    childrenData = [CHILD_A];
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Mijn Kinderen')).not.toBeInTheDocument();
  });

  it('renders each child with grade and streak once loaded, and no XP', async () => {
    childrenData = [CHILD_A];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Mijn Kinderen')).toBeInTheDocument());
    expect(screen.getByText('Test Child A')).toBeInTheDocument();
    expect(screen.getByText('3de leerjaar')).toBeInTheDocument();
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1 van 3 kinderen')).toBeInTheDocument();
  });

  it('says "onbeperkt" instead of 999 on the School package', async () => {
    childrenData = [CHILD_A];
    subscriptionData = { plan: 'school', max_children: 999, status: 'active' };
    renderScreen();

    expect(await screen.findByText('1 kind · onbeperkt')).toBeInTheDocument();
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();
  });

  it("shows each child's own Buddy, and no Buddy yet for a child that still has to choose", async () => {
    // A buddy_states row defaults to nootje before the child chooses; only
    // species_school_year says the child really picked one.
    const CHILD_C = { ...CHILD_B, id: 'child-3', name: 'Test Child C', buddy_states: { species: 'nootje', species_school_year: null } };
    childrenData = [CHILD_A, CHILD_B, CHILD_C];
    const { container } = renderScreen();
    await screen.findByText('Test Child C');
    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toContain('loeka-happy');
    expect(screen.getAllByText('Kiest zelf een Buddy')).toHaveLength(2);
  });

  it('shows the empty state and navigates to add-child from it', async () => {
    childrenData = [];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Nog geen kinderen')).toBeInTheDocument());
    // Both the header action and the empty-state CTA read "Kind toevoegen" —
    // click the empty-state one specifically (the last match in the tree).
    const addButtons = screen.getAllByText('Kind toevoegen');
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(navigateMock).toHaveBeenCalledWith('/app/parent/add-child');
  });

  it('navigates to a child detail screen when its row is clicked', async () => {
    childrenData = [CHILD_A];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Test Child A')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Test Child A'));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent/child/child-1');
  });

  it('disables adding a child and shows the upgrade banner once the subscription limit is reached', async () => {
    subscriptionData = { plan: 'basic', max_children: 1, status: 'active' };
    childrenData = [CHILD_A];
    renderScreen();

    await waitFor(() => expect(screen.getByText(/maximum aantal kinderen bereikt/i)).toBeInTheDocument());

    // Two buttons render the label "Kind toevoegen" text overall — the header
    // action button is disabled; scope to it specifically via its disabled attr.
    const headerButtons = screen.getAllByRole('button').filter((b) => b.textContent?.includes('Kind toevoegen'));
    const headerAddButton = headerButtons.find((b) => (b as HTMLButtonElement).disabled);
    expect(headerAddButton).toBeTruthy();

    fireEvent.click(screen.getByText('Upgrade je plan'));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent/subscription');
  });

  describe('paused children', () => {
    const PLAYING = { ...CHILD_A, paused: false };
    const PAUSED_1 = { ...CHILD_B, paused: true };
    const PAUSED_2 = { ...CHILD_B, id: 'child-3', name: 'Test Child C', paused: true };

    it('marks paused children and says how many may play', async () => {
      childrenData = [PLAYING, PAUSED_1, PAUSED_2];
      subscriptionData = { plan: 'free', max_children: 1, status: 'active' };
      renderScreen();

      await screen.findByText('Test Child C');
      expect(screen.getAllByText('Gepauzeerd')).toHaveLength(2);
      expect(screen.getByText(/2 kinderen zijn gepauzeerd: je abonnement laat 1 kind spelen/)).toBeInTheDocument();
    });

    it('shows no pause banner when everyone can play', async () => {
      childrenData = [PLAYING];
      renderScreen();
      await screen.findByText('Test Child A');
      expect(screen.queryByText('Kies wie mag spelen')).not.toBeInTheDocument();
    });

    it('lets the parent choose who keeps playing, no more than the package allows', async () => {
      childrenData = [PLAYING, PAUSED_1, PAUSED_2];
      subscriptionData = { plan: 'free', max_children: 1, status: 'active' };
      renderScreen();

      fireEvent.click(await screen.findByText('Kies wie mag spelen'));
      const a = await screen.findByRole('checkbox', { name: 'Test Child A' });
      const b = screen.getByRole('checkbox', { name: 'Test Child B' });
      expect(a).toHaveAttribute('aria-checked', 'true');
      // Full: B cannot be added until A is unticked.
      expect(b).toBeDisabled();

      fireEvent.click(a);
      fireEvent.click(b);
      fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

      await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('set_active_children', { p_child_ids: ['child-2'] }));
    });
  });
});

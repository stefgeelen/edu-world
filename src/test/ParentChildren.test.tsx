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
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { ParentChildren } from '@/screens/parent/ParentChildren';

const CHILD_A = {
  id: 'child-1', name: 'Test Child A', age: 8, grade: 3, xp: 240, level: 2,
  streak: 4, avatar_url: null, avatar_id: 'avatar-1', pending_promotion: false,
};
const CHILD_B = {
  id: 'child-2', name: 'Test Child B', age: 6, grade: 1, xp: 10, level: 1,
  streak: 0, avatar_url: null, avatar_id: 'avatar-2', pending_promotion: true,
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
  });

  it('shows a loading indicator before the children query resolves', () => {
    childrenData = [CHILD_A];
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Mijn Kinderen')).not.toBeInTheDocument();
  });

  it('renders each child with grade, XP, and streak once loaded', async () => {
    childrenData = [CHILD_A];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Mijn Kinderen')).toBeInTheDocument());
    expect(screen.getByText('Test Child A')).toBeInTheDocument();
    expect(screen.getByText('3de leerjaar')).toBeInTheDocument();
    expect(screen.getByText('240 XP')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1 van 3 kinderen')).toBeInTheDocument();
  });

  it('shows the pending-promotion badge only for the child who has one', async () => {
    childrenData = [CHILD_A, CHILD_B];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Test Child B')).toBeInTheDocument());
    expect(screen.getAllByText('Promotie beschikbaar')).toHaveLength(1);
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
});

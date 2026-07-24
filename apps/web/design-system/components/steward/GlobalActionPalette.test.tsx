import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { InterfaceProvider, useInterfaceState } from '../../../state/interface/InterfaceContext';
import { HighlightRegistryProvider, useRegisterHighlightTarget } from '../../../state/highlight/HighlightRegistryContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { GlobalActionPalette } from './GlobalActionPalette';
import * as conversationsApi from '../../../lib/api/conversations';

jest.mock('../../../lib/api/conversations');

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function TargetButton({ id, label }: { id: string; label: string }) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLButtonElement>(id, { label });
  return (
    <button ref={ref} data-active={isActive}>
      {label}
    </button>
  );
}

function OpenPanelIds() {
  const { interfaceState } = useInterfaceState();
  return <div data-testid="open-panels">{interfaceState.openPanelIds.join(',')}</div>;
}

function renderPalette() {
  return render(
    <SessionProvider>
      <InterfaceProvider>
        <HighlightRegistryProvider>
          <ConversationProvider>
            <SignedInAs>
              <TargetButton id="Home.NextMission" label="Your next mission" />
              <OpenPanelIds />
              <GlobalActionPalette />
            </SignedInAs>
          </ConversationProvider>
        </HighlightRegistryProvider>
      </InterfaceProvider>
    </SessionProvider>,
  );
}

describe('GlobalActionPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has a visible, accessible trigger and stays closed by default', () => {
    renderPalette();
    expect(screen.getByRole('button', { name: /Open the command palette/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on click of the visible trigger', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('opens on Cmd+K and closes on Escape', async () => {
    renderPalette();
    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters deterministic navigation options as the member types, using the canonical surface registry', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));

    await userEvent.type(screen.getByRole('combobox'), 'Documents');

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Documents')).toBeInTheDocument();
    expect(within(listbox).queryByText('Journey')).not.toBeInTheDocument();
  });

  it('does not offer Academy as a navigation option (C2 — cut for V1)', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));

    await userEvent.type(screen.getByRole('combobox'), 'Academy');

    expect(screen.queryByRole('option', { name: 'Academy' })).not.toBeInTheDocument();
  });

  it('navigates and closes when a navigation option is clicked', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    await userEvent.type(screen.getByRole('combobox'), 'Documents');

    await userEvent.click(screen.getByRole('option', { name: 'Documents' }));

    expect(push).toHaveBeenCalledWith('/documents');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists a currently-registered highlight target and activates it on selection', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    await userEvent.type(screen.getByRole('combobox'), 'next mission');

    await userEvent.click(screen.getByRole('option', { name: 'Your next mission' }));

    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'true');
  });

  it('supports full keyboard-only operation: Enter selects the first (default-active) option', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    await userEvent.type(screen.getByRole('combobox'), 'Documents');

    // The Documents nav option is listed first (before the always-appended
    // "Ask your Steward" entry), and index 0 is active by default.
    await userEvent.keyboard('{Enter}');

    expect(push).toHaveBeenCalledWith('/documents');
  });

  it('moves the active option down with ArrowDown and selects it with Enter', async () => {
    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    await userEvent.type(screen.getByRole('combobox'), 'Documents');

    // Two options exist for "Documents": the nav option, then "Ask your Steward".
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends a free-text question to the Steward, including currently-visible interface context, and opens the workspace panel', async () => {
    mockedApi.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'msg-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Here is your journey.', createdAt: 'x',
    });

    renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    await userEvent.type(screen.getByRole('combobox'), 'take me to my journey please');

    await userEvent.click(screen.getByRole('option', { name: /Ask your Steward/ }));

    expect(mockedApi.sendMessage).toHaveBeenCalledWith(
      'token-123', 'conv-1', 'take me to my journey please',
      expect.stringContaining('Home.NextMission'),
    );
    expect(screen.getByTestId('open-panels')).toHaveTextContent('steward-workspace');
  });

  it('has no accessibility violations when open', async () => {
    const { container } = renderPalette();
    await userEvent.click(screen.getByRole('button', { name: /Open the command palette/ }));
    expect(await axe(container)).toHaveNoViolations();
  });
});

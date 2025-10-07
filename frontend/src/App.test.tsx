import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./api/client', () => {
  const noop = vi.fn();
  return {
    listContacts: vi.fn().mockResolvedValue([]),
    createContact: vi.fn().mockResolvedValue({}),
    listMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({}),
    listBroadcasts: vi.fn().mockResolvedValue([]),
    createBroadcast: vi.fn().mockResolvedValue({}),
    listChannels: vi.fn().mockResolvedValue([]),
    createChannel: vi.fn().mockResolvedValue({}),
    updateChannelStatus: vi.fn().mockResolvedValue({}),
    getAnalyticsSummary: vi.fn().mockResolvedValue({ contacts: 0, messages: 0, inbound: 0, outbound: 0 }),
    createWorkflowNode: noop,
  };
});

describe('App navigation', () => {
  it('navigates between primary pages via top navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('Unified Inbox')).toBeInTheDocument();

    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: 'Broadcasts' }));
    expect(await screen.findByText('Compose Broadcast')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Channels' }));
    expect(await screen.findByText('Add Channel')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Analytics' }));
    expect(await screen.findByText('Workspace Summary')).toBeInTheDocument();
  });
});

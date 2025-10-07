import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChannelsPage from './ChannelsPage';
import * as api from '../api/client';

vi.mock('../api/client');

const listChannelsMock = vi.spyOn(api, 'listChannels');
const createChannelMock = vi.spyOn(api, 'createChannel');
const updateChannelStatusMock = vi.spyOn(api, 'updateChannelStatus');

describe('ChannelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listChannelsMock.mockReset();
    createChannelMock.mockReset();
    updateChannelStatusMock.mockReset();
    listChannelsMock.mockResolvedValue([]);
    createChannelMock.mockResolvedValue({} as any);
    updateChannelStatusMock.mockResolvedValue({} as any);
  });

  it('renders channels returned by API', async () => {
    listChannelsMock.mockResolvedValueOnce([
      { id: 'c1', name: 'WhatsApp', type: 'whatsapp', status: 'active', updatedAt: new Date().toISOString() }
    ]);

    render(<ChannelsPage />);

    expect(await screen.findByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'active' })).toBeInTheDocument();
  });

  it('creates a channel and refreshes list', async () => {
    listChannelsMock.mockResolvedValueOnce([]);
    render(<ChannelsPage />);

    await waitFor(() => expect(listChannelsMock).toHaveBeenCalledTimes(1));

    listChannelsMock.mockResolvedValueOnce([
      { id: 'c2', name: 'Support Line', type: 'sms', status: 'active', updatedAt: new Date().toISOString() }
    ]);
    createChannelMock.mockResolvedValueOnce({} as any);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText('Name');
    const typeSelect = screen.getByLabelText('Type');
    await user.clear(nameInput);
    await user.type(nameInput, 'Support Line');
    await user.selectOptions(typeSelect, 'sms');
    await user.click(screen.getByRole('button', { name: 'Create Channel' }));

    await waitFor(() => expect(createChannelMock).toHaveBeenCalledWith({ name: 'Support Line', type: 'sms', config: {} }));
    expect(await screen.findByText('Support Line')).toBeInTheDocument();
  });

  it('updates channel status', async () => {
    listChannelsMock.mockResolvedValueOnce([
      { id: 'c3', name: 'Sales', type: 'email', status: 'inactive', updatedAt: null }
    ]);

    render(<ChannelsPage />);

    expect(await screen.findByText('Sales')).toBeInTheDocument();

    listChannelsMock.mockResolvedValueOnce([
      { id: 'c3', name: 'Sales', type: 'email', status: 'active', updatedAt: null }
    ]);
    updateChannelStatusMock.mockResolvedValueOnce({} as any);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'active' }));

    await waitFor(() => expect(updateChannelStatusMock).toHaveBeenCalledWith('c3', 'active'));
    const row = await screen.findByRole('row', { name: /Sales/i });
    expect(row).toHaveTextContent('active');
  });

  it('shows error when load fails', async () => {
    listChannelsMock.mockRejectedValueOnce(new Error('load error'));
    render(<ChannelsPage />);

    expect(await screen.findByText('load error')).toBeInTheDocument();
  });
});

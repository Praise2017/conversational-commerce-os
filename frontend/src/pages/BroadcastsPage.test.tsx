import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BroadcastsPage from './BroadcastsPage';
import * as api from '../api/client';

vi.mock('../api/client');

const listBroadcastsMock = vi.spyOn(api, 'listBroadcasts');
const createBroadcastMock = vi.spyOn(api, 'createBroadcast');

describe('BroadcastsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists broadcasts returned by API', async () => {
    listBroadcastsMock.mockResolvedValueOnce([
      {
        id: 'b1',
        name: 'Campaign A',
        status: 'completed',
        scheduledAt: null,
        metrics: { targeted: 10, sent: 9, failed: 1 },
        updatedAt: new Date().toISOString()
      }
    ]);

    render(<BroadcastsPage />);

    await waitFor(() => expect(listBroadcastsMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Campaign A')).toBeInTheDocument();
    expect(screen.getByText(/targeted: 10/)).toBeInTheDocument();
  });

  it('handles create broadcast and refresh', async () => {
    listBroadcastsMock.mockResolvedValueOnce([]);
    render(<BroadcastsPage />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText('Name');
    const templateInput = screen.getByLabelText('Template text');
    const scheduleButton = screen.getByRole('button', { name: 'Schedule Broadcast' });

    await waitFor(() => expect(listBroadcastsMock).toHaveBeenCalledTimes(1));

    listBroadcastsMock.mockResolvedValueOnce([
      { id: 'b2', name: 'New Campaign', status: 'scheduled', scheduledAt: null, metrics: {}, updatedAt: new Date().toISOString() }
    ]);
    createBroadcastMock.mockResolvedValueOnce({} as any);

    await user.clear(nameInput);
    await user.type(nameInput, 'New Campaign');
    await user.clear(templateInput);
    await user.type(templateInput, 'Hello');
    await user.click(scheduleButton);

    await waitFor(() => expect(createBroadcastMock).toHaveBeenCalled());
    expect(await screen.findByText('New Campaign')).toBeInTheDocument();
  });

  it('shows error when load fails', async () => {
    listBroadcastsMock.mockRejectedValueOnce(new Error('load fail'));
    render(<BroadcastsPage />);

    await waitFor(() => expect(screen.getByText('load fail')).toBeInTheDocument());
  });
});

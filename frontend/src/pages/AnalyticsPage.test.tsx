import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsPage from './AnalyticsPage';
import * as api from '../api/client';

vi.mock('../api/client');

const getAnalyticsSummaryMock = vi.spyOn(api, 'getAnalyticsSummary');

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAnalyticsSummaryMock.mockReset();
  });

  it('renders metrics returned by the API', async () => {
    getAnalyticsSummaryMock.mockResolvedValueOnce({ contacts: 5, messages: 12, inbound: 3, outbound: 9 });

    render(<AnalyticsPage />);

    const contactsLabel = await screen.findByText('Contacts');
    expect(within(contactsLabel.parentElement as HTMLElement).getByText('5')).toBeInTheDocument();
    const messagesLabel = screen.getByText('Messages');
    expect(within(messagesLabel.parentElement as HTMLElement).getByText('12')).toBeInTheDocument();
    const inboundLabel = screen.getByText('Inbound');
    expect(within(inboundLabel.parentElement as HTMLElement).getByText('3')).toBeInTheDocument();
    const outboundLabel = screen.getByText('Outbound');
    expect(within(outboundLabel.parentElement as HTMLElement).getByText('9')).toBeInTheDocument();
  });

  it('refreshes metrics when clicking Refresh', async () => {
    getAnalyticsSummaryMock.mockResolvedValueOnce({ contacts: 1, messages: 2, inbound: 3, outbound: 4 });

    render(<AnalyticsPage />);

    await waitFor(() => expect(getAnalyticsSummaryMock).toHaveBeenCalledTimes(1));

    getAnalyticsSummaryMock.mockResolvedValueOnce({ contacts: 10, messages: 20, inbound: 30, outbound: 40 });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(getAnalyticsSummaryMock).toHaveBeenCalledTimes(2));
    const contactsLabel = await screen.findByText('Contacts');
    expect(within(contactsLabel.parentElement as HTMLElement).getByText('10')).toBeInTheDocument();
  });

  it('shows error message when request fails', async () => {
    getAnalyticsSummaryMock.mockRejectedValueOnce(new Error('API 500'));

    render(<AnalyticsPage />);

    expect(await screen.findByText('API 500')).toBeInTheDocument();
  });
});

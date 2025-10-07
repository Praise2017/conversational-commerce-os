import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactDetails from './ContactDetails';
import * as api from '../api/client';

vi.mock('../api/client');

const listMessagesMock = vi.spyOn(api, 'listMessages');
const sendMessageMock = vi.spyOn(api, 'sendMessage');

const contact = {
  id: 'contact-1',
  displayName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1234567890',
  createdAt: new Date().toISOString(),
};

describe('ContactDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMessagesMock.mockReset();
    sendMessageMock.mockReset();
    listMessagesMock.mockResolvedValue([]);
    sendMessageMock.mockResolvedValue({});
  });

  it('renders placeholder when no contact selected', () => {
    render(<ContactDetails contact={null} />);
    expect(screen.getByText('Select a contact')).toBeInTheDocument();
  });

  it('loads and displays messages for selected contact', async () => {
    listMessagesMock.mockResolvedValueOnce([
      { id: 'm1', direction: 'outbound', mtype: 'text', text: 'Hi!', createdAt: new Date().toISOString() },
    ]);

    render(<ContactDetails contact={contact} />);

    expect(await screen.findByText('Hi!')).toBeInTheDocument();
    expect(listMessagesMock).toHaveBeenCalledWith(contact.id);
  });

  it('sends message and refreshes list', async () => {
    listMessagesMock.mockResolvedValueOnce([]);
    render(<ContactDetails contact={contact} />);

    await waitFor(() => expect(listMessagesMock).toHaveBeenCalledTimes(1));

    listMessagesMock.mockResolvedValueOnce([
      { id: 'm2', direction: 'outbound', mtype: 'text', text: 'Follow up', createdAt: new Date().toISOString() },
    ]);
    sendMessageMock.mockResolvedValueOnce({});

    fireEvent.change(screen.getByPlaceholderText('Type a message'), { target: { value: 'Follow up' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith(contact.id, 'Follow up'));
    expect(await screen.findByText('Follow up')).toBeInTheDocument();
  });

  it('shows error message when loading fails', async () => {
    listMessagesMock.mockRejectedValueOnce(new Error('API 500'));
    render(<ContactDetails contact={contact} />);

    expect(await screen.findByText('API 500')).toBeInTheDocument();
  });
});

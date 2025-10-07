import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnifiedInbox from './UnifiedInbox';
import * as api from '../api/client';

vi.mock('../api/client');

const listContactsMock = vi.spyOn(api, 'listContacts');
const createContactMock = vi.spyOn(api, 'createContact');

describe('UnifiedInbox', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    listContactsMock.mockReset();
    createContactMock.mockReset();
    listContactsMock.mockResolvedValue([]);
    createContactMock.mockResolvedValue({} as any);
  });

  it('renders contacts returned by API', async () => {
    listContactsMock.mockResolvedValueOnce([
      { id: '1', displayName: 'Jane', email: 'jane@example.com' },
      { id: '2', displayName: 'John', email: 'john@example.com' }
    ]);

    render(<UnifiedInbox onSelect={onSelect} />);

    expect(await screen.findByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows error message when loading fails', async () => {
    listContactsMock.mockRejectedValueOnce(new Error('Boom'));
    render(<UnifiedInbox onSelect={onSelect} />);

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('creates a contact and refreshes the list', async () => {
    listContactsMock.mockResolvedValueOnce([]);
    render(<UnifiedInbox onSelect={onSelect} />);

    await waitFor(() => expect(listContactsMock).toHaveBeenCalledTimes(1));

    listContactsMock.mockResolvedValueOnce([{ id: '2', displayName: 'New Contact', email: 'new@example.com' }]);
    createContactMock.mockResolvedValueOnce({ id: '2' } as any);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Display name'), 'New Contact');
    await user.type(screen.getByPlaceholderText('Email (optional)'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createContactMock).toHaveBeenCalledWith({ displayName: 'New Contact', email: 'new@example.com' }));
    expect(await screen.findByText('New Contact')).toBeInTheDocument();
  });

  it('shows error when creating a contact fails', async () => {
    listContactsMock.mockResolvedValueOnce([]);
    render(<UnifiedInbox onSelect={onSelect} />);

    await waitFor(() => expect(listContactsMock).toHaveBeenCalledTimes(1));

    createContactMock.mockRejectedValueOnce(new Error('Failed to create contact'));

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Display name'), 'Broken');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Failed to create contact')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InboxPage from './InboxPage';
import * as api from '../api/client';

vi.mock('../api/client');

const listContactsMock = vi.spyOn(api, 'listContacts');
const listMessagesMock = vi.spyOn(api, 'listMessages');
const sendMessageMock = vi.spyOn(api, 'sendMessage');
const createBroadcastMock = vi.spyOn(api, 'createBroadcast');

type Contact = {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  createdAt: string;
};

type Message = {
  id: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  mtype: string;
  text?: string;
  createdAt: string;
};

function buildContact(overrides: Partial<Contact> = {}) {
  return {
    id: 'contact-1',
    displayName: 'Default User',
    email: 'user@example.com',
    phone: '+1234567890',
    createdAt: new Date().toISOString(),
    ...overrides,
  } satisfies Contact;
}

function buildMessage(overrides: Partial<Message> = {}) {
  return {
    id: 'message-1',
    contactId: 'contact-1',
    direction: 'outbound',
    mtype: 'text',
    text: 'Hello there',
    createdAt: new Date().toISOString(),
    ...overrides,
  } satisfies Message;
}

describe('InboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listContactsMock.mockReset();
    listMessagesMock.mockReset();
    sendMessageMock.mockReset();
    createBroadcastMock.mockReset();
    listContactsMock.mockResolvedValue([]);
    listMessagesMock.mockResolvedValue([]);
    sendMessageMock.mockResolvedValue({} as any);
    createBroadcastMock.mockResolvedValue({} as any);
  });

  it('renders list and side panels', async () => {
    listContactsMock.mockResolvedValueOnce([
      buildContact({ id: 'contact-1', displayName: 'Ada Lovelace' }),
      buildContact({ id: 'contact-2', displayName: 'Grace Hopper' }),
    ]);

    render(<InboxPage />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Workflow Builder' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Broadcast Composer' })).toBeInTheDocument();
  });

  it('selects a contact and shows messages', async () => {
    const contact = buildContact({ id: 'contact-42', displayName: 'Support Contact' });
    listContactsMock.mockResolvedValueOnce([contact]);
    listMessagesMock.mockResolvedValueOnce([
      buildMessage({ id: 'm1', contactId: contact.id, text: 'Hi Support', direction: 'inbound' }),
      buildMessage({ id: 'm2', contactId: contact.id, text: 'We can help!', direction: 'outbound' }),
    ]);

    render(<InboxPage />);

    const contactItem = await screen.findByText('Support Contact');
    contactItem.click();

    const detail = await screen.findByRole('heading', { name: 'Contact Details' });
    expect(detail).toBeInTheDocument();
    expect(screen.getByText('We can help!')).toBeInTheDocument();
  });

  it('shows message form in detail panel', async () => {
    listContactsMock.mockResolvedValueOnce([buildContact({ displayName: 'Composer User' })]);

    render(<InboxPage />);

    const composerUser = await screen.findByText('Composer User');
    composerUser.click();

    const messageForm = await screen.findByPlaceholderText('Type a message');
    expect(messageForm).toBeInTheDocument();
  });
});

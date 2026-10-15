import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from '../components/NotificationBell';
import { NotificationProvider } from '../context/NotificationContext';
import { SocketProvider } from '../context/SocketContext';

vi.mock('../api/notificationsApi', () => ({
  notificationsApi: {
    getNotifications: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'notif-1',
          type: 'chat_message',
          title: 'New message from Alice',
          message: 'Can I pickup the textbook today?',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ],
      meta: { unreadCount: 1, total: 1 }
    }),
    markRead: vi.fn().mockResolvedValue({ success: true }),
    markAllRead: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('NotificationBell Component', () => {
  it('renders notification bell button', () => {
    render(
      <BrowserRouter>
        <SocketProvider>
          <NotificationProvider>
            <NotificationBell />
          </NotificationProvider>
        </SocketProvider>
      </BrowserRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('opens notification center dropdown when clicked', async () => {
    render(
      <BrowserRouter>
        <SocketProvider>
          <NotificationProvider>
            <NotificationBell />
          </NotificationProvider>
        </SocketProvider>
      </BrowserRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    expect(await screen.findByText(/Notifications/i)).toBeInTheDocument();
  });
});

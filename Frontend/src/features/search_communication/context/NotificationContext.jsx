import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api/notificationsApi';
import { useSocket } from './SocketContext';
import { useAuth } from '../../marketplace/hooks/useAuth';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications({ limit: 25 });
      if (res && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.meta?.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail if unauthenticated / offline
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time socket notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications(prev => {
        if (prev.some(n => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

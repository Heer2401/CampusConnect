import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api/notificationsApi';
import { useSocket } from './SocketContext';
import { useAuth } from '../../../context/AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentUserId = (user?._id || user?.id || user?.userId)?.toString();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications({ limit: 30 });
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

  // Periodic background sync fallback (every 15s) in case WebSocket is suspended or reconnecting
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Real-time socket notification & chat listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      if (!notif) return;
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleIncomingChatMessage = (msg) => {
      if (!msg) return;
      const senderId = (msg.senderId?._id || msg.senderId?.id || msg.senderId)?.toString();
      // If message is from someone else, refresh notifications to capture the new notification
      if (currentUserId && senderId && senderId !== currentUserId) {
        fetchNotifications();
      }
    };

    socket.on('notification', handleNewNotification);
    socket.on('chat_message', handleIncomingChatMessage);
    socket.on('connect', fetchNotifications);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('chat_message', handleIncomingChatMessage);
      socket.off('connect', fetchNotifications);
    };
  }, [socket, currentUserId, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadChatCount = notifications.filter(
    (n) => !n.isRead && (n.type === 'chat_message' || n.relatedModel === 'ChatThread')
  ).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadChatCount,
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

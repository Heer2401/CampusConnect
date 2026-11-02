import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';

const SocketContext = createContext(null);

const getSocketServerUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  // In browser, dynamically resolve backend host on port 5000 or same origin
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const resolvedUserId = user?._id || user?.id || user?.userId;

  useEffect(() => {
    // Connect with JWT token or devUser fallback
    const authToken = token || localStorage.getItem('cc_token') || localStorage.getItem('token');
    const devUser = localStorage.getItem('devUser');

    if (!resolvedUserId && !authToken && !devUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = getSocketServerUrl();

    const newSocket = io(socketUrl, {
      auth: {
        token: authToken,
        userId: resolvedUserId,
        devUser: user
          ? { id: resolvedUserId, role: user.role, name: user.profile?.name || user.name }
          : (devUser ? JSON.parse(devUser) : null)
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to real-time server with id:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected from server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection warning:', err.message);
      setIsConnected(false);
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [resolvedUserId, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext) || { socket: null, isConnected: false };
};

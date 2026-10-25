import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { chatApi } from '../api/chatApi';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Send,
  Check,
  CheckCheck,
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
  Package,
  IndianRupee,
  User,
  MapPin,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

// Helper to parse automated order and meetup system messages into clean structured data
function parseOrderMessage(content) {
  if (!content || typeof content !== 'string') return null;
  const isOrder =
    content.includes('ORDER REQUEST PLACED') ||
    content.includes('Order Request Placed') ||
    content.includes('Order request placed') ||
    content.includes('Meetup Coordination') ||
    content.includes('Handover PIN');
  if (!isOrder) return null;

  const itemMatch = content.match(/(?:Item:|Listing:)\s*([^\n•]+)/i);
  const typeMatch = content.match(/Type:\s*([^\n•]+)/i);
  const amountMatch = content.match(/Amount:\s*([^\n•]+)/i);
  const buyerMatch = content.match(/Buyer:\s*([^\n•]+)/i);
  const orderIdMatch = content.match(/(?:Order ID:|Transaction ID:|Order Ref:)\s*([^\n•\s]+)/i);

  return {
    item: itemMatch ? itemMatch[1].trim() : null,
    type: typeMatch ? typeMatch[1].trim() : 'Sale',
    amount: amountMatch ? amountMatch[1].trim() : null,
    buyer: buyerMatch ? buyerMatch[1].trim() : null,
    orderId: orderIdMatch ? orderIdMatch[1].trim() : null,
  };
}

// Resolves actual user display name checking profile.name, name, and email prefix
function getUserDisplayName(u) {
  if (!u) return 'Campus Student';
  if (typeof u === 'string') return 'Campus Student';
  const name = u.profile?.name || u.name;
  if (name && typeof name === 'string' && name.trim()) return name.trim();
  if (u.email && typeof u.email === 'string') {
    const prefix = u.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'Campus Student';
}

// Generates 1-2 letter avatar initials from name
function getUserInitials(u) {
  const name = getUserDisplayName(u);
  if (!name || name === 'Campus Student') return 'CS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Safely finds the conversation partner (other participant)
function getOtherParticipant(thread, currentUserId) {
  if (!thread) return null;
  const myId = (currentUserId?._id || currentUserId?.id || currentUserId)?.toString();

  if (Array.isArray(thread.participants) && thread.participants.length > 0) {
    const found = thread.participants.find((p) => {
      const pid = (p?._id || p?.id || p)?.toString();
      return pid && pid !== myId;
    });
    if (found && typeof found === 'object') return found;
  }

  if (thread.otherParticipant && typeof thread.otherParticipant === 'object') {
    return thread.otherParticipant;
  }

  if (thread.listingId?.owner && typeof thread.listingId.owner === 'object') {
    const ownerId = (thread.listingId.owner._id || thread.listingId.owner.id || thread.listingId.owner)?.toString();
    if (ownerId && ownerId !== myId) {
      return thread.listingId.owner;
    }
  }

  return null;
}

const QUICK_REPLIES = [
  'Where should we meet?',
  'Is it still available?',
  'Library at 5 pm?',
];

export const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeThreadIdFromUrl = searchParams.get('thread');

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(activeThreadIdFromUrl || null);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState(null);

  const messagesContainerRef = useRef(null);

  // Directly scroll the messages container without scrolling window
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  // Load threads on mount
  const fetchThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      setError(null);
      const res = await chatApi.getThreads();
      const list = res.data || [];
      setThreads(list);

      // Default active thread if none specified and threads exist
      if (!activeThreadIdFromUrl && list.length > 0) {
        setActiveThreadId(list[0]._id);
        setSearchParams({ thread: list[0]._id }, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoadingThreads(false);
    }
  }, [activeThreadIdFromUrl, setSearchParams]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // When activeThreadIdFromUrl changes
  useEffect(() => {
    if (activeThreadIdFromUrl && activeThreadIdFromUrl !== activeThreadId) {
      setActiveThreadId(activeThreadIdFromUrl);
    }
  }, [activeThreadIdFromUrl]);

  // Load messages whenever activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null);
      setMessages([]);
      return;
    }

    const loadThreadData = async () => {
      try {
        setLoadingMessages(true);
        setError(null);

        const [threadRes, messagesRes] = await Promise.all([
          chatApi.getThreadById(activeThreadId),
          chatApi.getMessages(activeThreadId),
        ]);

        setActiveThread(threadRes.data);
        setMessages(messagesRes.data || []);
        setTimeout(() => scrollToBottom('auto'), 40);

        // Clear local unread count for this thread
        setThreads((prev) =>
          prev.map((t) => (t._id === activeThreadId ? { ...t, unreadCount: 0 } : t))
        );
      } catch (err) {
        setError(err.message || 'Failed to load message history');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadThreadData();

    // Socket.io room join
    if (socket && isConnected) {
      socket.emit('join_thread', { threadId: activeThreadId }, (ack) => {
        if (ack && !ack.success) {
          console.warn('[Socket] join_thread rejected:', ack.error);
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_thread', { threadId: activeThreadId });
      }
    };
  }, [activeThreadId, socket, isConnected]);

  // Real-time socket message handler
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (newMessage) => {
      const incomingThreadId = (newMessage.threadId?._id || newMessage.threadId)?.toString();
      const currentActiveId = activeThreadId?.toString();

      if (incomingThreadId && currentActiveId && incomingThreadId === currentActiveId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        chatApi.markThreadRead(activeThreadId).catch(() => {});
      }

      setThreads((prev) => {
        const index = prev.findIndex((t) => t._id?.toString() === incomingThreadId);
        if (index === -1) {
          fetchThreads();
          return prev;
        }

        const updated = [...prev];
        const target = { ...updated[index] };
        target.lastMessagePreview = newMessage.content;
        target.lastMessageAt = newMessage.createdAt;
        if (incomingThreadId !== currentActiveId) {
          target.unreadCount = (target.unreadCount || 0) + 1;
        }
        updated.splice(index, 1);
        updated.unshift(target);
        return updated;
      });
    };

    socket.on('chat_message', handleIncomingMessage);

    const handleReconnect = () => {
      if (activeThreadId) {
        socket.emit('join_thread', { threadId: activeThreadId });
      }
      fetchThreads();
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('chat_message', handleIncomingMessage);
      socket.off('connect', handleReconnect);
    };
  }, [socket, activeThreadId, fetchThreads]);

  const handleSelectThread = (threadId) => {
    setActiveThreadId(threadId);
    setSearchParams({ thread: threadId });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const content = messageInput.trim();
    if (!content || !activeThreadId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const res = await chatApi.sendMessage(activeThreadId, content);

      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });

      setMessageInput('');

      setThreads((prev) => {
        const index = prev.findIndex((t) => t._id === activeThreadId);
        if (index === -1) return prev;
        const updated = [...prev];
        const target = { ...updated[index] };
        target.lastMessagePreview = content;
        target.lastMessageAt = new Date();
        updated.splice(index, 1);
        updated.unshift(target);
        return updated;
      });
    } catch (err) {
      alert('Could not send message: ' + (err.message || 'Network error'));
    } finally {
      setSendingMessage(false);
    }
  };

  const currentUserId = user?._id || user?.id;

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '1.25rem 1rem 0.5rem',
        height: 'calc(100vh - 84px)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Messages
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
            Chat with buyers and sellers about campus listings.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#f59e0b',
              display: 'inline-block',
            }}
          />
          <span style={{ color: isConnected ? '#059669' : '#d97706', fontWeight: 500 }}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            flexShrink: 0,
            background: '#fee2e2',
            color: '#991b1b',
            padding: '8px 14px',
            borderRadius: 6,
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Main Chat Card (2 Columns) ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Left Column: Conversations with independent scroll ────────────── */}
        <div
          style={{
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            background: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#0f172a',
            }}
          >
            Conversations ({threads.length})
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {loadingThreads ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    color: '#64748b',
                  }}
                >
                  <MessageSquare size={20} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>No Messages Yet</div>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                  Browse items and message sellers to start a chat!
                </p>
                <Link
                  to="/browse"
                  style={{
                    display: 'inline-block',
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#059669',
                    textDecoration: 'none',
                  }}
                >
                  Browse Marketplace →
                </Link>
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = thread._id === activeThreadId;
                const otherUser = getOtherParticipant(thread, currentUserId);
                const otherUserName = getUserDisplayName(otherUser);
                const otherUserInitials = getUserInitials(otherUser);
                const listing = thread.listingId;

                return (
                  <div
                    key={thread._id}
                    onClick={() => handleSelectThread(thread._id)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      borderLeft: isSelected ? '3px solid #10b981' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Initials Avatar */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {otherUserInitials}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {otherUserName}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              borderRadius: '999px',
                              padding: '1px 6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>

                      {listing && (
                        <div
                          style={{
                            fontSize: '0.775rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px',
                          }}
                        >
                          {listing.title}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px',
                        }}
                      >
                        {thread.lastMessagePreview || 'Conversation started'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Active Thread ─────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          {activeThread ? (
            <>
              {/* Sticky Top Bar: Peer info + Listing widget */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '12px 18px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#ffffff',
                  zIndex: 5,
                }}
              >
                {/* Peer Info */}
                {(() => {
                  const activeOtherUser = getOtherParticipant(activeThread, currentUserId);
                  const activeName = getUserDisplayName(activeOtherUser);
                  const activeInitials = getUserInitials(activeOtherUser);
                  const programOrTag = activeOtherUser?.profile?.program || 'MSc IT';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {activeInitials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                          {activeName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{programOrTag}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Listing Context Pill */}
                {activeThread.listingId && (
                  <Link
                    to={`/listings/${activeThread.listingId._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 10px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {activeThread.listingId.images?.[0]?.thumbnailUrl ? (
                        <img
                          src={activeThread.listingId.images[0].thumbnailUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon size={14} />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          maxWidth: 160,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#0f172a',
                        }}
                      >
                        {activeThread.listingId.title}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#2563eb', fontWeight: 600 }}>
                        {activeThread.listingId.listingType === 'sell' && `₹${activeThread.listingId.price}`}
                        {activeThread.listingId.listingType === 'rent' &&
                          `₹${activeThread.listingId.rentalRate}/${activeThread.listingId.rentalPeriod}`}
                        {activeThread.listingId.listingType === 'giveaway' && 'Free'}
                        {activeThread.listingId.listingType === 'exchange' && 'Swap'}
                        {' · '}
                        <span style={{ textDecoration: 'underline' }}>View item</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Messages Container with independent auto-scroll */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#ffffff',
                }}
              >
                {loadingMessages ? (
                  <div style={{ margin: 'auto', color: '#94a3b8', fontSize: 13 }}>
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                        color: '#10b981',
                      }}
                    >
                      <MessageSquare size={22} />
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Start the conversation!</div>
                    <p style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>
                      Coordinate campus meetup spots, ask about condition, or confirm timing.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = (msg.senderId?._id || msg.senderId)?.toString() === currentUserId?.toString();
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const orderInfo = parseOrderMessage(msg.content);

                    // Structured Order / Meetup Card
                    if (orderInfo && (orderInfo.item || orderInfo.orderId)) {
                      return (
                        <div
                          key={msg._id}
                          style={{
                            alignSelf: 'center',
                            width: '100%',
                            maxWidth: 520,
                            margin: '8px 0',
                          }}
                        >
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 14,
                              padding: '16px 18px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                          >
                            {/* Card Header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid #f1f5f9',
                                paddingBottom: 10,
                                marginBottom: 12,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CheckCircle2 size={22} color="#10b981" />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                                    Order request placed
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Meetup and escrow steps for this order
                                  </div>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {orderInfo.type || 'Sale'}
                              </span>
                            </div>

                            {/* 4-Column Summary Box */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 8,
                                background: '#f8fafc',
                                borderRadius: 8,
                                padding: '10px 14px',
                                marginBottom: 12,
                                fontSize: '0.775rem',
                              }}
                            >
                              <div>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Listing</div>
                                <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {orderInfo.item || 'Item'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Amount</div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {orderInfo.amount || '-'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Buyer</div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {orderInfo.buyer || 'Student'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Order ref</div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                  {orderInfo.orderId ? `#${orderInfo.orderId.slice(-6)}` : '#order'}
                                </div>
                              </div>
                            </div>

                            {/* Meetup and Handover Blue Box */}
                            <div
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #dbeafe',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: '0.75rem',
                                color: '#1e3a8a',
                                lineHeight: 1.5,
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 4, color: '#1e3a8a' }}>
                                Meetup and handover
                              </div>
                              <ol style={{ margin: 0, paddingLeft: 16 }}>
                                <li>Chat here to agree on a campus meetup spot and time.</li>
                                <li>At the meetup, the seller opens Transactions and taps Show PIN.</li>
                                <li>The buyer enters the 6-digit PIN to confirm receipt and release the payment.</li>
                              </ol>
                            </div>

                            {/* Action Row */}
                            <div
                              style={{
                                marginTop: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{timeStr}</span>
                              <Link
                                to="/transactions"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: '#10b981',
                                  color: '#ffffff',
                                  padding: '7px 14px',
                                  borderRadius: 8,
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                }}
                              >
                                Open transaction
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Standard message bubble
                    return (
                      <div
                        key={msg._id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            background: isMe ? '#0f172a' : '#f1f5f9',
                            color: isMe ? '#ffffff' : '#0f172a',
                            padding: '8px 14px',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            fontSize: '0.85rem',
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.content}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>{timeStr}</span>
                          {isMe && (
                            <span style={{ fontSize: '0.675rem', color: msg.readAt ? '#10b981' : '#94a3b8' }}>
                              {msg.readAt ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reply Pills */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '6px 18px',
                  display: 'flex',
                  gap: 8,
                  background: '#ffffff',
                  borderTop: '1px solid #f8fafc',
                  flexWrap: 'wrap',
                }}
              >
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setMessageInput(reply)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.color = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Bottom Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  flexShrink: 0,
                  padding: '10px 18px 14px',
                  display: 'flex',
                  gap: 10,
                  background: '#ffffff',
                }}
              >
                <input
                  type="text"
                  placeholder="Type a message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendingMessage}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sendingMessage}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: messageInput.trim() && !sendingMessage ? 'pointer' : 'not-allowed',
                    opacity: messageInput.trim() && !sendingMessage ? 1 : 0.6,
                  }}
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: '#94a3b8',
                }}
              >
                <MessageSquare size={24} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Select a Conversation
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: 4 }}>
                Choose a conversation from the sidebar to view chat history and negotiate listings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

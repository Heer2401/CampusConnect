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
  Search,
  Smile,
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
    type: typeMatch ? typeMatch[1].trim() : 'SALE',
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

function formatThreadTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Lock document body overflow so whole page never scrolls, keeping scroll local to panels
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

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

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const other = getOtherParticipant(t, currentUserId);
    const name = getUserDisplayName(other).toLowerCase();
    const title = (t.listingId?.title || '').toLowerCase();
    const lastMsg = (t.lastMessagePreview || '').toLowerCase();
    return name.includes(q) || title.includes(q) || lastMsg.includes(q);
  });

  return (
    <div className="chat-page">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="chat-header">
        <div>
          <h1 className="chat-title">Messages</h1>
          <p className="chat-subtitle">Chat with buyers and sellers about campus listings.</p>
        </div>

        <div className="chat-status-badge">
          <span
            className="chat-status-dot"
            style={{ background: isConnected ? '#10b981' : '#f59e0b' }}
          />
          <span style={{ color: isConnected ? '#10b981' : '#d97706' }}>
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
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Main Chat Area (Split Container) ─────────────────────────────────── */}
      <div className="chat-main-container">
        {/* ── Left Sidebar: Conversations ─────────────────────────────────────── */}
        <div className="chat-sidebar-card">
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title">Conversations ({threads.length})</div>
            <div className="chat-search-box">
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                className="chat-search-input"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-thread-list">
            {loadingThreads ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading conversations...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
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
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                  {searchQuery ? 'No matching conversations' : 'No Messages Yet'}
                </div>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                  {searchQuery
                    ? 'Try searching with another name or title'
                    : 'Browse items and message sellers to start a chat!'}
                </p>
                {!searchQuery && (
                  <Link
                    to="/marketplace"
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563eb',
                      textDecoration: 'none',
                    }}
                  >
                    Browse Marketplace →
                  </Link>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread._id === activeThreadId;
                const otherUser = getOtherParticipant(thread, currentUserId);
                const otherUserName = getUserDisplayName(otherUser);
                const otherUserInitials = getUserInitials(otherUser);
                const listing = thread.listingId;
                const timeStr = formatThreadTime(thread.lastMessageAt || thread.updatedAt);

                return (
                  <div
                    key={thread._id}
                    onClick={() => handleSelectThread(thread._id)}
                    className={`chat-thread-item ${isSelected ? 'active' : ''}`}
                  >
                    {/* Initials Avatar */}
                    <div className="chat-avatar">{otherUserInitials}</div>

                    {/* Details */}
                    <div className="chat-thread-info">
                      <div className="chat-thread-top">
                        <span className="chat-thread-name">{otherUserName}</span>
                        {timeStr && <span className="chat-thread-time">{timeStr}</span>}
                      </div>

                      {listing && (
                        <div className="chat-thread-item-title">{listing.title}</div>
                      )}

                      <div className="chat-thread-preview-row">
                        <div className="chat-thread-preview">
                          {thread.lastMessagePreview || 'Conversation started'}
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="chat-unread-badge">{thread.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Active Chat Window ─────────────────────────────────── */}
        <div className="chat-window-card">
          {activeThread ? (
            <>
              {/* Top Bar: Peer info + Mini Listing Widget */}
              <div className="chat-window-header">
                {/* Peer Info */}
                {(() => {
                  const activeOtherUser = getOtherParticipant(activeThread, currentUserId);
                  const activeName = getUserDisplayName(activeOtherUser);
                  const activeInitials = getUserInitials(activeOtherUser);
                  const programOrTag = activeOtherUser?.profile?.program || 'MSc IT';

                  return (
                    <div className="chat-header-partner">
                      <div className="chat-header-avatar">{activeInitials}</div>
                      <div>
                        <div className="chat-header-name">{activeName}</div>
                        <div className="chat-header-sub">{programOrTag}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Listing Context Pill */}
                {activeThread.listingId && (
                  <Link
                    to={`/marketplace/${activeThread.listingId._id}`}
                    className="chat-listing-pill"
                  >
                    <div className="chat-listing-thumb">
                      {activeThread.listingId.images?.[0]?.thumbnailUrl ||
                      activeThread.listingId.images?.[0]?.url ? (
                        <img
                          src={
                            activeThread.listingId.images[0].thumbnailUrl ||
                            activeThread.listingId.images[0].url
                          }
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon size={16} />
                      )}
                    </div>
                    <div>
                      <div className="chat-listing-pill-title">
                        {activeThread.listingId.title}
                      </div>
                      <div className="chat-listing-pill-link">
                        {activeThread.listingId.listingType === 'sell' &&
                          `₹${Number(activeThread.listingId.price || 0).toLocaleString('en-IN')}`}
                        {activeThread.listingId.listingType === 'rent' &&
                          `₹${activeThread.listingId.rentalRate || 0}/${activeThread.listingId.rentalPeriod || 'day'}`}
                        {activeThread.listingId.listingType === 'giveaway' && 'Free'}
                        {activeThread.listingId.listingType === 'exchange' && 'Swap'}
                        {' · '}
                        <span>View item</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Messages Container with auto-scroll */}
              <div ref={messagesContainerRef} className="chat-messages-container">
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
                    const isMe =
                      (msg.senderId?._id || msg.senderId)?.toString() === currentUserId?.toString();
                    const timeStr = formatThreadTime(msg.createdAt);
                    const orderInfo = parseOrderMessage(msg.content);

                    // Structured Order / Meetup Card
                    if (orderInfo && (orderInfo.item || orderInfo.orderId)) {
                      return (
                        <div key={msg._id} className="chat-order-card-wrapper">
                          <div className="chat-order-card">
                            {/* Card Header */}
                            <div className="chat-order-header">
                              <div className="chat-order-header-left">
                                <CheckCircle2 size={24} color="#10b981" />
                                <div>
                                  <div className="chat-order-title">Order request placed</div>
                                  <div className="chat-order-subtitle">
                                    Meetup and escrow steps for this order.
                                  </div>
                                </div>
                              </div>
                              <span className="chat-order-badge">
                                {orderInfo.type || 'SALE'}
                              </span>
                            </div>

                            {/* 4-Column Summary Box */}
                            <div className="chat-order-grid">
                              <div>
                                <div className="chat-order-col-label">Listing</div>
                                <div className="chat-order-col-val" title={orderInfo.item || 'Item'}>
                                  {orderInfo.item || 'Item'}
                                </div>
                              </div>
                              <div>
                                <div className="chat-order-col-label">Amount</div>
                                <div className="chat-order-col-val">
                                  {orderInfo.amount || '-'}
                                </div>
                              </div>
                              <div>
                                <div className="chat-order-col-label">Buyer</div>
                                <div className="chat-order-col-val">
                                  {orderInfo.buyer || 'Student'}
                                </div>
                              </div>
                              <div>
                                <div className="chat-order-col-label">Order ref</div>
                                <div className="chat-order-col-val" style={{ fontFamily: 'monospace' }}>
                                  {orderInfo.orderId ? `#${orderInfo.orderId.slice(-6)}` : '#order'}
                                </div>
                              </div>
                            </div>

                            {/* Meetup and Handover Blue Box */}
                            <div className="chat-order-handover-box">
                              <div className="chat-order-handover-title">Meetup and handover</div>
                              <div style={{ paddingLeft: 4 }}>
                                <div>1. Chat here to agree on a campus meetup spot and time.</div>
                                <div>2. At the meetup, the seller opens Transactions and tags Show PIN.</div>
                                <div>3. The buyer enters the 6-digit PIN to confirm receipt and release the payment.</div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="chat-order-footer">
                              <span className="chat-order-time">{timeStr}</span>
                              <Link to="/transactions" className="chat-order-btn">
                                Open transaction
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Standard message bubble
                    if (isMe) {
                      return (
                        <div key={msg._id} className="chat-bubble-outgoing-row">
                          <div className="chat-bubble-outgoing">{msg.content}</div>
                          <div className="chat-bubble-time">
                            <span>{timeStr}</span>
                            <span className="chat-bubble-receipt-blue">
                              {msg.readAt ? <CheckCheck size={14} /> : <Check size={14} />}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Incoming message
                    const otherUser = getOtherParticipant(activeThread, currentUserId);
                    const otherInitials = getUserInitials(otherUser);

                    return (
                      <div key={msg._id} className="chat-bubble-incoming-row">
                        <div className="chat-bubble-avatar">{otherInitials}</div>
                        <div className="chat-bubble-incoming">{msg.content}</div>
                        <div className="chat-bubble-time">
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reply Pills */}
              <div className="chat-quick-replies">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    className="chat-quick-chip"
                    onClick={() => setMessageInput(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Bottom Message Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                <div className="chat-input-box">
                  <button
                    type="button"
                    className="chat-emoji-btn"
                    title="Insert emoji"
                    onClick={() => setMessageInput((prev) => prev + ' 😊')}
                  >
                    <Smile size={20} />
                  </button>

                  <input
                    type="text"
                    className="chat-text-input"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sendingMessage}
                  />

                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!messageInput.trim() || sendingMessage}
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </button>
                </div>
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
export default ChatPage;

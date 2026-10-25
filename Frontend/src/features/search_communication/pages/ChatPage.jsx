import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { chatApi } from '../api/chatApi';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';

// Helper to parse automated order and meetup system messages into clean structured data
function parseOrderMessage(content) {
  if (!content || typeof content !== 'string') return null;
  const isOrder = content.includes('ORDER REQUEST PLACED') || 
                  content.includes('Order Request Placed') ||
                  content.includes('Meetup Coordination') ||
                  content.includes('Handover PIN');
  if (!isOrder) return null;

  // Extract key fields whether formatted with newlines or bullets
  const itemMatch = content.match(/(?:Item:|Listing:)\s*([^\n•]+)/i);
  const typeMatch = content.match(/Type:\s*([^\n•]+)/i);
  const amountMatch = content.match(/Amount:\s*([^\n•]+)/i);
  const buyerMatch = content.match(/Buyer:\s*([^\n•]+)/i);
  const orderIdMatch = content.match(/(?:Order ID:|Transaction ID:)\s*([^\n•\s]+)/i);

  return {
    item: itemMatch ? itemMatch[1].trim() : null,
    type: typeMatch ? typeMatch[1].trim() : 'ORDER',
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
  if (!name || name === 'Campus Student') return 'U';
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
    const found = thread.participants.find(p => {
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

  // Directly scroll the messages container without scrolling the browser window
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
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
          chatApi.getMessages(activeThreadId)
        ]);

        setActiveThread(threadRes.data);
        setMessages(messagesRes.data || []);
        setTimeout(() => scrollToBottom('auto'), 40);

        // Decrement or clear local unread count for this thread
        setThreads(prev =>
          prev.map(t => (t._id === activeThreadId ? { ...t, unreadCount: 0 } : t))
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

      // If message is for the currently open conversation, append it
      if (incomingThreadId && currentActiveId && incomingThreadId === currentActiveId) {
        setMessages(prev => {
          if (prev.some(m => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        // Automatically mark as read
        chatApi.markThreadRead(activeThreadId).catch(() => {});
      }

      // Update thread preview and lastMessageAt in thread list
      setThreads(prev => {
        const index = prev.findIndex(t => t._id?.toString() === incomingThreadId);
        if (index === -1) {
          // New thread received, refetch thread list
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

    // Rejoin thread room on socket reconnect
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
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !activeThreadId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const res = await chatApi.sendMessage(activeThreadId, content);

      // Optimistic append if socket didn't already append it
      setMessages(prev => {
        if (prev.some(m => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });

      setMessageInput('');

      // Update thread list preview
      setThreads(prev => {
        const index = prev.findIndex(t => t._id === activeThreadId);
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
      className="page chat-page-wrapper"
      style={{
        height: 'calc(100vh - 120px)',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0, fontWeight: 700, color: '#0f172a' }}>Marketplace Messages</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            Real-time chat with campus listing owners and buyers
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#eab308',
              display: 'inline-block'
            }}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ flexShrink: 0, background: '#fee2e2', color: '#991b1b', padding: '8px 14px', borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Main Chat Layout: 2 Columns */}
      <div
        className="card"
        style={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          overflow: 'hidden',
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
        }}
      >
        {/* Left: Conversations List with independent scroll */}
        <div
          style={{
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            background: '#fafbfc',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              fontSize: 14,
              background: '#fff'
            }}
          >
            Conversations ({threads.length})
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            {loadingThreads ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>No Messages Yet</div>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Browse items in the marketplace and click "Contact Seller" to start a chat!
                </p>
                <Link to="/browse" className="btn btn-secondary" style={{ marginTop: 12, fontSize: 12 }}>
                  Browse Items
                </Link>
              </div>
            ) : (
              threads.map(thread => {
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
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eef2ff' : 'transparent',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    {/* User Avatar */}
                    <div className="avatar" style={{ flexShrink: 0, width: 38, height: 38, fontSize: 14 }}>
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt="" style={{ width: '100%', borderRadius: '50%' }} />
                      ) : (
                        otherUserInitials
                      )}
                    </div>

                    {/* Thread Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                          {otherUserName}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span
                            className="pill pill-blue"
                            style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700 }}
                          >
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>

                      {listing && (
                        <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Item: <b>{listing.title}</b>
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: 12,
                          color: thread.unreadCount > 0 ? '#1e293b' : '#64748b',
                          fontWeight: thread.unreadCount > 0 ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: 2
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

        {/* Right: Active Chat Thread */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {activeThread ? (
            <>
              {/* Sticky Thread Header with Listing Context */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '12px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}
              >
                {/* Other participant info */}
                {(() => {
                  const activeOtherUser = getOtherParticipant(activeThread, currentUserId);
                  const activeName = getUserDisplayName(activeOtherUser);
                  const activeInitials = getUserInitials(activeOtherUser);
                  const programOrTag = activeOtherUser?.profile?.program || 'Verified Campus Student';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {activeOtherUser?.avatar ? (
                          <img src={activeOtherUser.avatar} alt="" style={{ width: '100%', borderRadius: '50%' }} />
                        ) : (
                          activeInitials
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
                          {activeName}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>{programOrTag}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Listing Context Widget */}
                {activeThread.listingId && (
                  <Link
                    to={`/listings/${activeThread.listingId._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 12px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    {activeThread.listingId.images?.[0]?.thumbnailUrl && (
                      <img
                        src={activeThread.listingId.images[0].thumbnailUrl}
                        alt=""
                        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeThread.listingId.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>
                        {activeThread.listingId.listingType === 'sell' && `₹${activeThread.listingId.price}`}
                        {activeThread.listingId.listingType === 'rent' && `₹${activeThread.listingId.rentalRate}/${activeThread.listingId.rentalPeriod}`}
                        {activeThread.listingId.listingType === 'giveaway' && 'Free'}
                        {activeThread.listingId.listingType === 'exchange' && 'Exchange'}
                        {' · '}
                        <span style={{ textDecoration: 'underline' }}>View Item</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Independent Scrollable Messages Container */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#f8fafc'
                }}
              >
                {loadingMessages ? (
                  <div style={{ margin: 'auto', color: '#94a3b8', fontSize: 14 }}>
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>👋</div>
                    <div style={{ fontWeight: 600 }}>Start the conversation!</div>
                    <p style={{ fontSize: 13, marginTop: 4 }}>
                      Ask questions about the listing condition, pickup timings, or coordinate meetups on campus.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = (msg.senderId?._id || msg.senderId)?.toString() === currentUserId?.toString();
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const orderInfo = parseOrderMessage(msg.content);

                    // Render structured Order Card if it's an automated order / escrow message
                    if (orderInfo && (orderInfo.item || orderInfo.orderId)) {
                      return (
                        <div
                          key={msg._id}
                          style={{
                            alignSelf: 'center',
                            width: '100%',
                            maxWidth: 520,
                            margin: '10px 0'
                          }}
                        >
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid #bfdbfe',
                              borderRadius: 14,
                              padding: '16px 18px',
                              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)'
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
                                marginBottom: 12
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 22 }}>🤝</span>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                                    Campus Order Request Placed!
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>
                                    Automated campus meetup & escrow coordination
                                  </div>
                                </div>
                              </div>
                              {orderInfo.type && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    background: '#e0e7ff',
                                    color: '#3730a3',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {orderInfo.type}
                                </span>
                              )}
                            </div>

                            {/* Summary Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: 10,
                                background: '#f8fafc',
                                borderRadius: 8,
                                padding: '10px 14px',
                                marginBottom: 12,
                                fontSize: 13
                              }}
                            >
                              {orderInfo.item && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>📦 Listing</div>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{orderInfo.item}</div>
                                </div>
                              )}
                              {orderInfo.amount && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>💰 Amount</div>
                                  <div style={{ fontWeight: 700, color: '#16a34a' }}>{orderInfo.amount}</div>
                                </div>
                              )}
                              {orderInfo.buyer && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>👤 Buyer</div>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{orderInfo.buyer}</div>
                                </div>
                              )}
                              {orderInfo.orderId && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>🆔 Order Ref</div>
                                  <div style={{ fontWeight: 600, color: '#6366f1', fontFamily: 'monospace' }}>
                                    {orderInfo.orderId}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Meetup Coordination Instructions */}
                            <div
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #dbeafe',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: 12,
                                color: '#1e40af',
                                lineHeight: 1.5
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>📍</span> Campus Meetup & Handover Instructions:
                              </div>
                              <ol style={{ margin: 0, paddingLeft: 18, color: '#1e3a8a' }}>
                                <li>Chat here to agree on a convenient campus meetup location and time.</li>
                                <li>When meeting in person, seller clicks <b>"Show PIN"</b> on their Escrow Dashboard.</li>
                                <li>Buyer enters the 6-digit PIN to confirm receipt and release funds safely!</li>
                              </ol>
                            </div>

                            {/* Action Row */}
                            <div
                              style={{
                                marginTop: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span className="muted" style={{ fontSize: 11 }}>{timeStr}</span>
                              <Link
                                to="/rentals?view=dashboard"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  padding: '7px 14px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                }}
                              >
                                🛡️ Open Escrow Dashboard →
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Standard User / System Message Bubble
                    return (
                      <div
                        key={msg._id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            background: isMe ? '#1d4ed8' : '#ffffff',
                            color: isMe ? '#ffffff' : '#1e293b',
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            fontSize: 14,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.content}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <span className="muted" style={{ fontSize: 11 }}>{timeStr}</span>
                          {isMe && (
                            <span style={{ fontSize: 11, color: msg.readAt ? '#2563eb' : '#94a3b8' }}>
                              {msg.readAt ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky Bottom Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  flexShrink: 0,
                  padding: 14,
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: 10,
                  background: '#fff',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10
                }}
              >
                <input
                  type="text"
                  placeholder="Type a message... (Press Enter to send)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendingMessage}
                  style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!messageInput.trim() || sendingMessage}
                  style={{ padding: '10px 20px' }}
                >
                  {sendingMessage ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <h2 style={{ fontSize: 18 }}>Select a Conversation</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Choose a conversation from the sidebar to view chat history and negotiate listings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

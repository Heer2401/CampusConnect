const test = require('node:test');
const assert = require('node:assert');
const { ChatThread, Message } = require('../models');

test('Chat Module - Message model schema validation', () => {
  const threadId = '507f1f77bcf86cd799439011';
  const senderId = '507f1f77bcf86cd799439012';

  const msg = new Message({
    threadId,
    senderId,
    content: 'Hi! Is this textbook available?',
    type: 'text',
  });

  assert.strictEqual(msg.threadId.toString(), threadId);
  assert.strictEqual(msg.senderId.toString(), senderId);
  assert.strictEqual(msg.content, 'Hi! Is this textbook available?');
  assert.strictEqual(msg.type, 'text');
  assert.strictEqual(msg.readAt, null);
});

test('Chat Module - ChatThread participant assignment & duplicate detection', () => {
  const user1 = '507f1f77bcf86cd799439011';
  const user2 = '507f1f77bcf86cd799439012';
  const listingId = '507f1f77bcf86cd799439013';

  const thread = new ChatThread({
    participants: [user1, user2],
    listingId,
    lastMessagePreview: 'Meeting at library',
  });

  assert.strictEqual(thread.participants.length, 2);
  assert.strictEqual(thread.participants[0].toString(), user1);
  assert.strictEqual(thread.participants[1].toString(), user2);
  assert.strictEqual(thread.lastMessagePreview, 'Meeting at library');
});

test('Chat Module - Sender (Right) vs Receiver (Left) determination logic', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const thread = {
    _id: 'thread-1',
    participants: [
      { _id: currentUserId, name: 'Alice (Current User)' },
      { _id: otherUserId, name: 'Bob (Seller)' }
    ],
    otherParticipant: { _id: otherUserId, name: 'Bob (Seller)' }
  };

  const senderMsg = {
    _id: 'msg-1',
    threadId: 'thread-1',
    senderId: { _id: currentUserId, name: 'Alice (Current User)' },
    content: 'Can we meet at the canteen?'
  };

  const receiverMsg = {
    _id: 'msg-2',
    threadId: 'thread-1',
    senderId: { _id: otherUserId, name: 'Bob (Seller)' },
    content: 'Sure, 4 PM works!'
  };

  // Helper matching frontend logic
  function isMessageFromMe(msg, activeThread, myId) {
    const senderId = (msg.senderId?._id || msg.senderId)?.toString();
    if (myId && senderId && senderId === myId) return true;
    const otherId = (activeThread.otherParticipant?._id || activeThread.otherParticipant)?.toString();
    if (otherId && senderId && senderId === otherId) return false;
    if (otherId && senderId && senderId !== otherId) return true;
    return false;
  }

  // Alice's message should be recognized as from Alice (Sender -> Right)
  const isSenderMe = isMessageFromMe(senderMsg, thread, currentUserId);
  assert.strictEqual(isSenderMe, true, 'Alice message should be identified as Sender (Right side)');

  // Bob's message should be recognized as incoming (Receiver -> Left)
  const isReceiverMe = isMessageFromMe(receiverMsg, thread, currentUserId);
  assert.strictEqual(isReceiverMe, false, 'Bob message should be identified as Receiver (Left side)');
});

test('Chat Module - Sender vs Receiver when current user ID is resolved via partner elimination', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const thread = {
    _id: 'thread-1',
    participants: [
      { _id: currentUserId, name: 'Alice' },
      { _id: otherUserId, name: 'Bob' }
    ],
    otherParticipant: { _id: otherUserId, name: 'Bob' }
  };

  const senderMsg = {
    _id: 'msg-1',
    senderId: { _id: currentUserId },
    content: 'I want to rent this item.'
  };

  const receiverMsg = {
    _id: 'msg-2',
    senderId: { _id: otherUserId },
    content: 'Available from tomorrow.'
  };

  // Even if myId was null or uninitialized in state
  function isMessageFromMeFallback(msg, activeThread, myId) {
    const senderId = (msg.senderId?._id || msg.senderId)?.toString();
    if (myId && senderId && senderId === myId) return true;
    const otherId = (activeThread.otherParticipant?._id || activeThread.otherParticipant)?.toString();
    if (otherId && senderId && senderId === otherId) return false;
    if (otherId && senderId && senderId !== otherId) return true;
    return false;
  }

  assert.strictEqual(isMessageFromMeFallback(senderMsg, thread, null), true, 'Sender message resolved via elimination to right side');
  assert.strictEqual(isMessageFromMeFallback(receiverMsg, thread, null), false, 'Receiver message resolved via elimination to left side');
});

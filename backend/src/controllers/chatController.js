const mongoose = require('mongoose');
const ChatThread = require('../models/ChatThread');
const Message = require('../models/Message');
const Listing = require('../models/Listing');
const { sendNotification } = require('../services/notificationService');

/**
 * GET /api/v1/chat/threads
 * List all conversations where current user is a participant.
 */
const getThreads = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const threads = await ChatThread.find({
      participants: userId
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name email profile avatar')
      .populate({
        path: 'listingId',
        select: 'title price rentalRate rentalPeriod listingType status images owner',
        populate: { path: 'owner', select: 'name avatar' }
      })
      .lean();

    // Attach unread count for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await Message.countDocuments({
          threadId: thread._id,
          senderId: { $ne: userId },
          readAt: null
        });

        // Other participant
        const otherParticipant = thread.participants.find(
          (p) => p._id.toString() !== userId.toString()
        ) || null;

        return {
          ...thread,
          unreadCount,
          otherParticipant
        };
      })
    );

    res.json({
      success: true,
      data: threadsWithUnread,
      meta: { total: threadsWithUnread.length }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chat/threads
 * Create or retrieve an existing conversation for a listing & recipient.
 */
const createOrGetThread = async (req, res, next) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    const { listingId, recipientId } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'A valid listingId is required' }
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Listing not found or has been removed' }
      });
    }

    // Determine target recipient (default to listing owner if not provided)
    const targetRecipientId = recipientId || listing.owner.toString();

    if (!mongoose.Types.ObjectId.isValid(targetRecipientId)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'A valid recipientId is required' }
      });
    }

    // Cannot start a conversation with oneself
    if (targetRecipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'You cannot initiate a conversation with yourself' }
      });
    }

    // Check for existing conversation with the same listing and participants
    let thread = await ChatThread.findOne({
      listingId,
      participants: { $all: [currentUserId, targetRecipientId] }
    })
      .populate('participants', 'name email profile avatar')
      .populate('listingId', 'title price rentalRate rentalPeriod listingType status images owner');

    if (thread) {
      return res.status(200).json({
        success: true,
        message: 'Existing conversation found',
        data: thread
      });
    }

    // Create new conversation
    thread = new ChatThread({
      participants: [currentUserId, targetRecipientId],
      listingId,
      lastMessageAt: new Date(),
      lastMessagePreview: ''
    });

    await thread.save();

    const populated = await ChatThread.findById(thread._id)
      .populate('participants', 'name email profile avatar')
      .populate('listingId', 'title price rentalRate rentalPeriod listingType status images owner');

    res.status(201).json({
      success: true,
      message: 'Conversation started',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chat/threads/:id
 * Get single conversation details with authorization check.
 */
const getThreadById = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Invalid conversation ID' }
      });
    }

    const thread = await ChatThread.findById(id)
      .populate('participants', 'name email profile avatar')
      .populate('listingId', 'title price rentalRate rentalPeriod listingType status images owner');

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Conversation not found' }
      });
    }

    // Server-side authorization check
    const isParticipant = thread.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: 'Access denied: You are not a participant in this conversation' }
      });
    }

    res.json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chat/threads/:id/messages
 * Retrieve message history for a conversation.
 */
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Invalid conversation ID' }
      });
    }

    const thread = await ChatThread.findById(id);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Conversation not found' }
      });
    }

    // Authorization
    const isParticipant = thread.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: 'Access denied: You are not a participant in this conversation' }
      });
    }

    // Automatically mark unread incoming messages as read
    await Message.updateMany(
      { threadId: id, senderId: { $ne: userId }, readAt: null },
      { readAt: new Date() }
    );

    const messages = await Message.find({ threadId: id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name avatar')
      .lean();

    res.json({
      success: true,
      data: messages,
      meta: { total: messages.length }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chat/threads/:id/messages
 * Send and persist a message in a conversation.
 */
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user._id || req.user.id;
    const { id } = req.params;
    const { content, type = 'text' } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Invalid conversation ID' }
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Message content cannot be empty' }
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Message exceeds maximum limit of 2000 characters' }
      });
    }

    const thread = await ChatThread.findById(id);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Conversation not found' }
      });
    }

    // Authorization
    const isParticipant = thread.participants.some(
      (p) => p.toString() === senderId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: 'Access denied: You cannot send messages to this conversation' }
      });
    }

    // Save message
    const message = new Message({
      threadId: id,
      senderId,
      content: content.trim(),
      type: ['text', 'image', 'system'].includes(type) ? type : 'text',
      readAt: null
    });

    await message.save();

    // Update thread preview and timestamp
    thread.lastMessageAt = new Date();
    thread.lastMessagePreview = content.trim().substring(0, 80);
    await thread.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name avatar');

    // Identify recipient for notification & live delivery
    const recipientId = thread.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

    // Push real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Broadcast to thread room
      io.to(`thread:${id}`).emit('chat_message', populatedMessage);

      // Also deliver to recipient's personal room in case they don't have the thread open
      if (recipientId) {
        io.to(`user:${recipientId.toString()}`).emit('chat_message', populatedMessage);
      }
    }

    // Dispatch persistent in-app notification to recipient
    if (recipientId) {
      const senderName = req.user.profile?.name || req.user.name || 'Campus Student';
      await sendNotification(req.app, {
        userId: recipientId,
        type: 'chat_message',
        title: `Message from ${senderName}`,
        message: content.trim().substring(0, 100),
        relatedId: thread._id,
        relatedModel: 'ChatThread'
      });
    }

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/chat/threads/:id/read
 * Explicitly mark all messages in a thread as read.
 */
const markThreadRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Invalid conversation ID' }
      });
    }

    const thread = await ChatThread.findById(id);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Conversation not found' }
      });
    }

    const isParticipant = thread.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: 'Access denied' }
      });
    }

    await Message.updateMany(
      { threadId: id, senderId: { $ne: userId }, readAt: null },
      { readAt: new Date() }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`thread:${id}`).emit('messages_read', { threadId: id, readBy: userId });
    }

    res.json({ success: true, message: 'Thread marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getThreads,
  createOrGetThread,
  getThreadById,
  getMessages,
  sendMessage,
  markThreadRead
};

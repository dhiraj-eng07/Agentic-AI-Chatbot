// backend/src/controllers/chatController.js

const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const aiService = require('../services/aiService');
const { validateMessage } = require('../utils/helpers');

/**
 * @desc    Send a message to the chatbot
 * @route   POST /api/chat/send
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { message, conversationId, context, userId } = req.body;
  const user = req.user || { _id: userId };

  // Validate input
  if (!message || message.trim() === '') {
    res.status(400);
    throw new Error('Message is required');
  }

  try {
    let conversation;
    
    // Find or create conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
      }
    } else {
      conversation = await Conversation.create({
        user: user._id,
        title: message.substring(0, 30) + '...',
        context: context || {}
      });
    }

    // Save user message
    const userMessage = await Message.create({
      conversation: conversation._id,
      sender: 'user',
      content: message,
      metadata: {
        userId: user._id,
        timestamp: new Date().toISOString()
      }
    });

    // Get AI response
    const aiResponse = await aiService.processMessage({
      message,
      context: {
        ...conversation.context,
        userId: user._id,
        conversationId: conversation._id
      },
      history: await Message.find({ 
        conversation: conversation._id 
      }).sort('createdAt').limit(10)
    });

    // Save AI response
    const assistantMessage = await Message.create({
      conversation: conversation._id,
      sender: 'assistant',
      content: aiResponse.text,
      metadata: {
        type: aiResponse.type || 'text',
        actions: aiResponse.actions || [],
        data: aiResponse.data || {},
        timestamp: new Date().toISOString()
      }
    });

    // Update conversation
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    
    if (aiResponse.type === 'meeting_scheduled' || aiResponse.type === 'task_created') {
      conversation.context = {
        ...conversation.context,
        ...aiResponse.data
      };
    }
    
    await conversation.save();

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation._id,
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          sender: userMessage.sender,
          timestamp: userMessage.metadata.timestamp
        },
        assistantMessage: {
          id: assistantMessage._id,
          content: assistantMessage.content,
          sender: assistantMessage.sender,
          type: assistantMessage.metadata.type,
          actions: assistantMessage.metadata.actions,
          data: assistantMessage.metadata.data,
          timestamp: assistantMessage.metadata.timestamp
        }
      }
    });

  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  }
});

/**
 * @desc    Get user conversations
 * @route   GET /api/chat/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const user = req.user;
  const { limit = 20, page = 1 } = req.query;

  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate({
      path: 'user',
      select: 'name email'
    })
    .select('-__v');

  const total = await Conversation.countDocuments({ user: user._id });

  res.json({
    success: true,
    data: conversations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/chat/conversations/:id/messages
 * @access  Private
 */
const getConversationMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, page = 1 } = req.query;
  const user = req.user;

  const skip = (page - 1) * limit;

  // Verify conversation belongs to user
  const conversation = await Conversation.findOne({
    _id: id,
    user: user._id
  });

  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }

  const messages = await Message.find({ conversation: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

  const total = await Message.countDocuments({ conversation: id });

  res.json({
    success: true,
    data: messages.reverse(), // Return in chronological order
    conversation: {
      id: conversation._id,
      title: conversation.title,
      context: conversation.context
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Delete a conversation
 * @route   DELETE /api/chat/conversations/:id
 * @access  Private
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const conversation = await Conversation.findOneAndDelete({
    _id: id,
    user: user._id
  });

  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }

  // Delete all messages in the conversation
  await Message.deleteMany({ conversation: id });

  res.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
});

/**
 * @desc    Clear all user conversations
 * @route   DELETE /api/chat/conversations
 * @access  Private
 */
const clearAllConversations = asyncHandler(async (req, res) => {
  const user = req.user;

  const conversations = await Conversation.find({ user: user._id });
  const conversationIds = conversations.map(conv => conv._id);

  // Delete all conversations
  await Conversation.deleteMany({ user: user._id });
  
  // Delete all messages in those conversations
  await Message.deleteMany({ conversation: { $in: conversationIds } });

  res.json({
    success: true,
    message: 'All conversations cleared successfully',
    count: conversations.length
  });
});

/**
 * @desc    Update conversation context
 * @route   PUT /api/chat/conversations/:id/context
 * @access  Private
 */
const updateContext = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { context } = req.body;
  const user = req.user;

  const conversation = await Conversation.findOneAndUpdate(
    { _id: id, user: user._id },
    { context: { ...conversation.context, ...context } },
    { new: true }
  );

  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }

  res.json({
    success: true,
    data: conversation
  });
});

/**
 * @desc    Get conversation summary/insights
 * @route   GET /api/chat/conversations/:id/summary
 * @access  Private
 */
const getConversationSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const conversation = await Conversation.findOne({
    _id: id,
    user: user._id
  }).populate({
    path: 'user',
    select: 'name email'
  });

  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }

  const messages = await Message.find({ conversation: id })
    .sort({ createdAt: 1 })
    .limit(100);

  // Generate summary using AI service
  const summary = await aiService.generateConversationSummary(messages);

  res.json({
    success: true,
    data: {
      conversation: {
        id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      summary: {
        keyPoints: summary.keyPoints,
        actionItems: summary.actionItems,
        sentiment: summary.sentiment,
        topics: summary.topics
      },
      statistics: {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.sender === 'user').length,
        assistantMessages: messages.filter(m => m.sender === 'assistant').length,
        duration: messages.length > 0 
          ? (new Date(messages[messages.length - 1].createdAt) - new Date(messages[0].createdAt)) / (1000 * 60) 
          : 0 // in minutes
      }
    }
  });
});

/**
 * @desc    Stream chat response (for real-time updates)
 * @route   POST /api/chat/stream
 * @access  Private
 */
const streamMessage = asyncHandler(async (req, res) => {
  const { message, conversationId, context, userId } = req.body;
  const user = req.user || { _id: userId };

  if (!message || message.trim() === '') {
    res.status(400);
    throw new Error('Message is required');
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let conversation;
    
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else {
      conversation = await Conversation.create({
        user: user._id,
        title: message.substring(0, 30) + '...',
        context: context || {}
      });
    }

    // Save user message
    const userMessage = await Message.create({
      conversation: conversation._id,
      sender: 'user',
      content: message,
      metadata: {
        userId: user._id,
        timestamp: new Date().toISOString()
      }
    });

    // Stream AI response
    const stream = await aiService.streamMessageResponse({
      message,
      context: {
        ...conversation.context,
        userId: user._id,
        conversationId: conversation._id
      }
    });

    let fullResponse = '';
    let responseType = 'text';
    let responseActions = [];
    let responseData = {};

    for await (const chunk of stream) {
      fullResponse += chunk.content || '';
      
      if (chunk.type) responseType = chunk.type;
      if (chunk.actions) responseActions = chunk.actions;
      if (chunk.data) responseData = { ...responseData, ...chunk.data };

      // Send chunk to client
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        content: chunk.content || '',
        done: false
      })}\n\n`);
    }

    // Save complete assistant message
    const assistantMessage = await Message.create({
      conversation: conversation._id,
      sender: 'assistant',
      content: fullResponse,
      metadata: {
        type: responseType,
        actions: responseActions,
        data: responseData,
        timestamp: new Date().toISOString()
      }
    });

    // Update conversation
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      messageId: assistantMessage._id,
      conversationId: conversation._id,
      data: {
        content: fullResponse,
        type: responseType,
        actions: responseActions,
        data: responseData
      }
    })}\n\n`);

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'Stream processing failed'
    })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

module.exports = {
  sendMessage,
  getConversations,
  getConversationMessages,
  deleteConversation,
  clearAllConversations,
  updateContext,
  getConversationSummary,
  streamMessage
};
const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/chatController');
const auth = require('../../middleware/auth');

// All routes require authentication
router.use(auth);

// Message routes
router.post('/send', chatController.sendMessage);
router.post('/stream', chatController.streamMessage);

// Conversation routes
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getConversationMessages);
router.get('/conversations/:id/summary', chatController.getConversationSummary);
router.delete('/conversations/:id', chatController.deleteConversation);
router.delete('/conversations', chatController.clearAllConversations);
router.put('/conversations/:id/context', chatController.updateContext);

module.exports = router;
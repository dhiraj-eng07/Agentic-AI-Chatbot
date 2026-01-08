const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findOne({
      _id: decoded.userId,
      'tokens.token': token,
      isActive: true
    });

    if (!user) {
      throw new Error('User not found or token invalid');
    }

    // Add user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Please authenticate'
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Please authenticate'
    });
  }
};

// Rate limiting by user ID
const userRateLimit = require('express-rate-limit');
const userLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many requests, please try again later.'
});

// Check permissions for meeting/task access
const checkMeetingPermissions = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const userId = req.user.id;
    
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Check if user is organizer or participant
    if (meeting.organizer.toString() !== userId.toString() &&
        !meeting.participants.some(p => p.userId.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    req.meeting = meeting;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

const checkTaskPermissions = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user is assigned to or assigned the task
    if (task.assignedTo.toString() !== userId.toString() &&
        task.assignedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    req.task = task;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  auth,
  adminAuth,
  userLimiter,
  checkMeetingPermissions,
  checkTaskPermissions
};
// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // Find user by id
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based Authorization Middleware
 * @param {...String} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attaches user if token exists, but doesn't block request
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional auth failed:', error.message);
  }
  
  next();
};

/**
 * API Key Authentication Middleware
 * For service-to-service communication or chatbot API access
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  // Validate API key (you can store valid API keys in environment variables or database)
  const validApiKeys = process.env.VALID_API_KEYS ? 
    process.env.VALID_API_KEYS.split(',') : [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  // Optional: Attach service info based on API key
  req.service = {
    type: 'api-key',
    id: apiKey.substring(0, 8) // First 8 chars for logging
  };
  
  next();
};

/**
 * Rate Limiting Middleware (Optional - can be used with auth)
 * Limits requests per user/IP
 */
const rateLimiter = (req, res, next) => {
  const userIdentifier = req.user ? req.user.id : req.ip;
  
  // You can implement Redis or memory store for rate limiting
  // For now, this is a placeholder structure
  req.rateLimit = {
    userIdentifier,
    limit: 100, // requests per window
    windowMs: 15 * 60 * 1000, // 15 minutes
    remaining: 99 // Would be calculated by actual rate limiter
  };
  
  next();
};

/**
 * Validate Meeting Access Middleware
 * Ensures user has access to the requested meeting
 */
const validateMeetingAccess = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // For admin users, allow access to all meetings
    if (userRole === 'admin') {
      return next();
    }
    
    // Find meeting and check if user is a participant
    const Meeting = require('../models/Meeting');
    const meeting = await Meeting.findOne({
      _id: meetingId,
      $or: [
        { organizer: userId },
        { participants: userId },
        { 'permissions.viewers': userId }
      ]
    });
    
    if (!meeting) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this meeting'
      });
    }
    
    req.meeting = meeting;
    next();
  } catch (error) {
    console.error('Meeting access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate meeting access'
    });
  }
};

/**
 * Validate Task Access Middleware
 * Ensures user has access to the requested task
 */
const validateTaskAccess = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole === 'admin') {
      return next();
    }
    
    const Task = require('../models/Task');
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { assignedTo: userId },
        { createdBy: userId },
        { 'permissions.viewers': userId }
      ]
    });
    
    if (!task) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this task'
      });
    }
    
    req.task = task;
    next();
  } catch (error) {
    console.error('Task access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate task access'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  apiKeyAuth,
  rateLimiter,
  validateMeetingAccess,
  authRoutes,
  validateTaskAccess
};
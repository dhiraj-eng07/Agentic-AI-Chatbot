const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { auth, checkMeetingPermissions } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const MeetingController = require('../../controllers/meetingController');

// @route   GET /api/meetings
// @desc    Get user's meetings with filters
// @access  Private
router.get(
  '/',
  auth,
  [
    query('status').optional().isIn(['scheduled', 'completed', 'cancelled']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 })
  ],
  asyncHandler(MeetingController.getMeetings)
);

// @route   GET /api/meetings/upcoming
// @desc    Get upcoming meetings
// @access  Private
router.get(
  '/upcoming',
  auth,
  asyncHandler(MeetingController.getUpcomingMeetings)
);

// @route   GET /api/meetings/:id
// @desc    Get meeting by ID
// @access  Private
router.get(
  '/:id',
  auth,
  checkMeetingPermissions,
  asyncHandler(MeetingController.getMeetingById)
);

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
router.post(
  '/',
  auth,
  [
    body('title').not().isEmpty().trim(),
    body('description').optional().trim(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('participants').optional().isArray(),
    body('agenda').optional().isArray(),
    body('location').optional().trim()
  ],
  asyncHandler(MeetingController.createMeeting)
);

// @route   PUT /api/meetings/:id
// @desc    Update meeting
// @access  Private
router.put(
  '/:id',
  auth,
  checkMeetingPermissions,
  [
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('participants').optional().isArray(),
    body('agenda').optional().isArray(),
    body('status').optional().isIn(['scheduled', 'completed', 'cancelled'])
  ],
  asyncHandler(MeetingController.updateMeeting)
);

// @route   DELETE /api/meetings/:id
// @desc    Delete meeting
// @access  Private
router.delete(
  '/:id',
  auth,
  checkMeetingPermissions,
  asyncHandler(MeetingController.deleteMeeting)
);

// @route   POST /api/meetings/:id/summary
// @desc    Generate meeting summary
// @access  Private
router.post(
  '/:id/summary',
  auth,
  checkMeetingPermissions,
  [
    body('transcript').optional().trim(),
    body('actionItems').optional().isArray()
  ],
  asyncHandler(MeetingController.generateSummary)
);

// @route   POST /api/meetings/:id/transcript
// @desc    Upload meeting transcript
// @access  Private
router.post(
  '/:id/transcript',
  auth,
  checkMeetingPermissions,
  [
    body('transcript').not().isEmpty().trim()
  ],
  asyncHandler(MeetingController.uploadTranscript)
);

// @route   POST /api/meetings/:id/action-items
// @desc    Add action items to meeting
// @access  Private
router.post(
  '/:id/action-items',
  auth,
  checkMeetingPermissions,
  [
    body('actionItems').isArray().notEmpty()
  ],
  asyncHandler(MeetingController.addActionItems)
);

// @route   POST /api/meetings/:id/reminders
// @desc    Send meeting reminders
// @access  Private
router.post(
  '/:id/reminders',
  auth,
  checkMeetingPermissions,
  asyncHandler(MeetingController.sendReminders)
);

// @route   GET /api/meetings/:id/participants
// @desc    Get meeting participants
// @access  Private
router.get(
  '/:id/participants',
  auth,
  checkMeetingPermissions,
  asyncHandler(MeetingController.getParticipants)
);

// @route   POST /api/meetings/:id/participants
// @desc    Add participants to meeting
// @access  Private
router.post(
  '/:id/participants',
  auth,
  checkMeetingPermissions,
  [
    body('participants').isArray().notEmpty()
  ],
  asyncHandler(MeetingController.addParticipants)
);

// @route   PUT /api/meetings/:id/participants/:participantId
// @desc    Update participant status
// @access  Private
router.put(
  '/:id/participants/:participantId',
  auth,
  checkMeetingPermissions,
  [
    body('status').isIn(['invited', 'accepted', 'declined', 'tentative'])
  ],
  asyncHandler(MeetingController.updateParticipantStatus)
);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { auth, checkTaskPermissions } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const TaskController = require('../../controllers/taskController');

// @route   GET /api/tasks
// @desc    Get user's tasks with filters
// @access  Private
router.get(
  '/',
  auth,
  [
    query('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('assignedTo').optional().isMongoId(),
    query('assignedBy').optional().isMongoId(),
    query('dueDateFrom').optional().isISO8601(),
    query('dueDateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 })
  ],
  asyncHandler(TaskController.getTasks)
);

// @route   GET /api/tasks/upcoming
// @desc    Get upcoming tasks
// @access  Private
router.get(
  '/upcoming',
  auth,
  asyncHandler(TaskController.getUpcomingTasks)
);

// @route   GET /api/tasks/overview
// @desc    Get task overview statistics
// @access  Private
router.get(
  '/overview',
  auth,
  asyncHandler(TaskController.getTaskOverview)
);

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get(
  '/:id',
  auth,
  checkTaskPermissions,
  asyncHandler(TaskController.getTaskById)
);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/',
  auth,
  [
    body('title').not().isEmpty().trim(),
    body('description').optional().trim(),
    body('assignedTo').isMongoId(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('tags').optional().isArray()
  ],
  asyncHandler(TaskController.createTask)
);

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put(
  '/:id',
  auth,
  checkTaskPermissions,
  [
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'blocked']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').optional().isISO8601(),
    body('tags').optional().isArray()
  ],
  asyncHandler(TaskController.updateTask)
);

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete(
  '/:id',
  auth,
  checkTaskPermissions,
  asyncHandler(TaskController.deleteTask)
);

// @route   POST /api/tasks/:id/notes
// @desc    Add note to task
// @access  Private
router.post(
  '/:id/notes',
  auth,
  checkTaskPermissions,
  [
    body('content').not().isEmpty().trim()
  ],
  asyncHandler(TaskController.addNote)
);

// @route   PUT /api/tasks/:id/notes/:noteId
// @desc    Update task note
// @access  Private
router.put(
  '/:id/notes/:noteId',
  auth,
  checkTaskPermissions,
  [
    body('content').not().isEmpty().trim()
  ],
  asyncHandler(TaskController.updateNote)
);

// @route   DELETE /api/tasks/:id/notes/:noteId
// @desc    Delete task note
// @access  Private
router.delete(
  '/:id/notes/:noteId',
  auth,
  checkTaskPermissions,
  asyncHandler(TaskController.deleteNote)
);

// @route   POST /api/tasks/:id/reminders
// @desc    Set task reminder
// @access  Private
router.post(
  '/:id/reminders',
  auth,
  checkTaskPermissions,
  [
    body('reminderTime').isISO8601()
  ],
  asyncHandler(TaskController.setReminder)
);

// @route   DELETE /api/tasks/:id/reminders/:reminderId
// @desc    Remove task reminder
// @access  Private
router.delete(
  '/:id/reminders/:reminderId',
  auth,
  checkTaskPermissions,
  asyncHandler(TaskController.removeReminder)
);

// @route   POST /api/tasks/:id/dependencies
// @desc    Add task dependency
// @access  Private
router.post(
  '/:id/dependencies',
  auth,
  checkTaskPermissions,
  [
    body('taskId').isMongoId()
  ],
  asyncHandler(TaskController.addDependency)
);

// @route   DELETE /api/tasks/:id/dependencies/:dependencyId
// @desc    Remove task dependency
// @access  Private
router.delete(
  '/:id/dependencies/:dependencyId',
  auth,
  checkTaskPermissions,
  asyncHandler(TaskController.removeDependency)
);

// @route   POST /api/tasks/bulk
// @desc    Create multiple tasks
// @access  Private
router.post(
  '/bulk',
  auth,
  [
    body('tasks').isArray().notEmpty()
  ],
  asyncHandler(TaskController.createBulkTasks)
);

// @route   PUT /api/tasks/bulk/status
// @desc    Update multiple tasks status
// @access  Private
router.put(
  '/bulk/status',
  auth,
  [
    body('taskIds').isArray().notEmpty(),
    body('status').isIn(['todo', 'in-progress', 'review', 'completed', 'blocked'])
  ],
  asyncHandler(TaskController.updateBulkStatus)
);

module.exports = router;
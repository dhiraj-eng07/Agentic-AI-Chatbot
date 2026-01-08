const Task = require('../models/Task');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const EmailService = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');

class TaskController {
  // Get user's tasks with filters
  async getTasks(req, res) {
    const userId = req.user.id;
    const {
      status,
      priority,
      assignedTo,
      assignedBy,
      dueDateFrom,
      dueDateTo,
      search,
      limit = 20,
      page = 1
    } = req.query;

    // Build query
    const query = {
      $or: [
        { assignedTo: userId },
        { assignedBy: userId }
      ]
    };

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (assignedBy) query.assignedBy = assignedBy;
    
    // Date filters
    if (dueDateFrom || dueDateTo) {
      query.dueDate = {};
      if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
    }

    // Apply search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('assignedBy', 'name email avatar')
        .populate('meeting', 'title startTime')
        .sort({ dueDate: 1, priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  }

  // Get upcoming tasks
  async getUpcomingTasks(req, res) {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    const tasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { assignedBy: userId }
      ],
      dueDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['todo', 'in-progress'] }
    })
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name email')
    .sort({ dueDate: 1, priority: -1 });

    res.json({
      success: true,
      data: tasks
    });
  }

  // Get task overview statistics
  async getTaskOverview(req, res) {
    const userId = req.user.id;

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      tasksByPriority,
      tasksByStatus
    ] = await Promise.all([
      // Total tasks
      Task.countDocuments({
        $or: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      }),
      
      // Completed tasks
      Task.countDocuments({
        $or: [
          { assignedTo: userId },
          { assignedBy: userId }
        ],
        status: 'completed'
      }),
      
      // In progress tasks
      Task.countDocuments({
        $or: [
          { assignedTo: userId },
          { assignedBy: userId }
        ],
        status: 'in-progress'
      }),
      
      // Overdue tasks
      Task.countDocuments({
        $or: [
          { assignedTo: userId },
          { assignedBy: userId }
        ],
        status: { $in: ['todo', 'in-progress'] },
        dueDate: { $lt: new Date() }
      }),
      
      // Tasks by priority
      Task.aggregate([
        {
          $match: {
            $or: [
              { assignedTo: userId },
              { assignedBy: userId }
            ]
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Tasks by status
      Task.aggregate([
        {
          $match: {
            $or: [
              { assignedTo: userId },
              { assignedBy: userId }
            ]
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        tasksByPriority: tasksByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        tasksByStatus: tasksByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  }

  // Get task by ID
  async getTaskById(req, res) {
    const task = req.task;

    // Populate additional data
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('assignedBy', 'name email avatar');
    await task.populate('meeting', 'title startTime');
    
    // Get dependent tasks
    const dependencies = await Task.find({
      _id: { $in: task.dependencies }
    }).select('title status dueDate');

    res.json({
      success: true,
      data: {
        ...task.toObject(),
        dependencies
      }
    });
  }

  // Create new task
  async createTask(req, res) {
    const userId = req.user.id;
    const {
      title,
      description,
      assignedTo,
      dueDate,
      priority = 'medium',
      tags = [],
      meetingId
    } = req.body;

    // Check if assignedTo user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      throw new AppError('Assigned user not found', 404, 'USER_NOT_FOUND');
    }

    // Check if meeting exists (if provided)
    if (meetingId) {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new AppError('Meeting not found', 404, 'MEETING_NOT_FOUND');
      }
    }

    // Create task
    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      tags,
      meeting: meetingId,
      status: 'todo'
    });

    await task.save();

    // Send notification to assigned user
    await EmailService.sendTaskAssignment({
      to: assignedUser.email,
      task,
      assigner: req.user
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  }

  // Update task
  async updateTask(req, res) {
    const task = req.task;
    const updates = req.body;

    // Validate updates
    const allowedUpdates = [
      'title', 'description', 'status', 'priority',
      'dueDate', 'tags', 'estimatedTime'
    ];

    const isValidUpdate = Object.keys(updates).every(key => 
      allowedUpdates.includes(key)
    );

    if (!isValidUpdate) {
      throw new AppError('Invalid updates', 400, 'INVALID_UPDATES');
    }

    // Store old values for comparison
    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo;

    // Apply updates
    Object.keys(updates).forEach(key => {
      task[key] = updates[key];
    });

    await task.save();

    // Send notifications for important changes
    if (oldStatus !== task.status) {
      await this.sendStatusUpdateNotification(task, oldStatus);
    }

    if (updates.assignedTo && updates.assignedTo.toString() !== oldAssignedTo.toString()) {
      const newAssignee = await User.findById(updates.assignedTo);
      if (newAssignee) {
        await EmailService.sendTaskReassignment({
          to: newAssignee.email,
          task,
          previousAssignee: oldAssignedTo,
          assigner: req.user
        });
      }
    }

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    });
  }

  // Delete task
  async deleteTask(req, res) {
    const task = req.task;

    // Remove task from dependencies of other tasks
    await Task.updateMany(
      { dependencies: task._id },
      { $pull: { dependencies: task._id } }
    );

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  }

  // Add note to task
  async addNote(req, res) {
    const task = req.task;
    const { content } = req.body;

    task.notes.push({
      content,
      addedBy: req.user.id
    });

    await task.save();

    res.json({
      success: true,
      data: task.notes[task.notes.length - 1],
      message: 'Note added successfully'
    });
  }

  // Update task note
  async updateNote(req, res) {
    const task = req.task;
    const { noteId } = req.params;
    const { content } = req.body;

    const note = task.notes.id(noteId);
    
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }

    // Check if user can update note
    if (note.addedBy.toString() !== req.user.id.toString() && 
        task.assignedTo.toString() !== req.user.id.toString() &&
        task.assignedBy.toString() !== req.user.id.toString()) {
      throw new AppError('Not authorized to update this note', 403, 'NOT_AUTHORIZED');
    }

    note.content = content;
    note.updatedAt = new Date();

    await task.save();

    res.json({
      success: true,
      data: note,
      message: 'Note updated successfully'
    });
  }

  // Delete task note
  async deleteNote(req, res) {
    const task = req.task;
    const { noteId } = req.params;

    const note = task.notes.id(noteId);
    
    if (!note) {
      throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    }

    // Check if user can delete note
    if (note.addedBy.toString() !== req.user.id.toString() && 
        task.assignedTo.toString() !== req.user.id.toString() &&
        task.assignedBy.toString() !== req.user.id.toString()) {
      throw new AppError('Not authorized to delete this note', 403, 'NOT_AUTHORIZED');
    }

    task.notes.pull(noteId);
    await task.save();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  }

  // Set task reminder
  async setReminder(req, res) {
    const task = req.task;
    const { reminderTime } = req.body;

    task.reminders.push(new Date(reminderTime));
    await task.save();

    res.json({
      success: true,
      data: task.reminders[task.reminders.length - 1],
      message: 'Reminder set successfully'
    });
  }

  // Remove task reminder
  async removeReminder(req, res) {
    const task = req.task;
    const { reminderId } = req.params;

    // MongoDB stores dates as Date objects, so we need to find by timestamp
    const reminderIndex = task.reminders.findIndex(
      reminder => reminder.getTime().toString() === reminderId
    );

    if (reminderIndex === -1) {
      throw new AppError('Reminder not found', 404, 'REMINDER_NOT_FOUND');
    }

    task.reminders.splice(reminderIndex, 1);
    await task.save();

    res.json({
      success: true,
      message: 'Reminder removed successfully'
    });
  }

  // Add task dependency
  async addDependency(req, res) {
    const task = req.task;
    const { taskId } = req.body;

    // Check if dependency task exists
    const dependencyTask = await Task.findById(taskId);
    if (!dependencyTask) {
      throw new AppError('Dependency task not found', 404, 'TASK_NOT_FOUND');
    }

    // Check for circular dependency
    if (await this.hasCircularDependency(task, taskId)) {
      throw new AppError('Circular dependency detected', 400, 'CIRCULAR_DEPENDENCY');
    }

    if (!task.dependencies.includes(taskId)) {
      task.dependencies.push(taskId);
      await task.save();
    }

    res.json({
      success: true,
      data: task.dependencies,
      message: 'Dependency added successfully'
    });
  }

  // Remove task dependency
  async removeDependency(req, res) {
    const task = req.task;
    const { dependencyId } = req.params;

    task.dependencies.pull(dependencyId);
    await task.save();

    res.json({
      success: true,
      data: task.dependencies,
      message: 'Dependency removed successfully'
    });
  }

  // Create multiple tasks
  async createBulkTasks(req, res) {
    const userId = req.user.id;
    const { tasks } = req.body;

    const createdTasks = [];
    const errors = [];

    for (const taskData of tasks) {
      try {
        // Validate required fields
        if (!taskData.title || !taskData.assignedTo) {
          errors.push({
            task: taskData,
            error: 'Title and assignedTo are required'
          });
          continue;
        }

        // Check if assignedTo user exists
        const assignedUser = await User.findById(taskData.assignedTo);
        if (!assignedUser) {
          errors.push({
            task: taskData,
            error: 'Assigned user not found'
          });
          continue;
        }

        const task = new Task({
          title: taskData.title,
          description: taskData.description || '',
          assignedTo: taskData.assignedTo,
          assignedBy: userId,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          priority: taskData.priority || 'medium',
          tags: taskData.tags || [],
          meeting: taskData.meetingId,
          status: 'todo'
        });

        await task.save();
        createdTasks.push(task);

        // Send notification
        await EmailService.sendTaskAssignment({
          to: assignedUser.email,
          task,
          assigner: req.user
        });

      } catch (error) {
        errors.push({
          task: taskData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdTasks,
        errors
      },
      message: `Created ${createdTasks.length} tasks successfully`
    });
  }

  // Update multiple tasks status
  async updateBulkStatus(req, res) {
    const userId = req.user.id;
    const { taskIds, status } = req.body;

    // Check if user has permission to update all tasks
    const tasks = await Task.find({
      _id: { $in: taskIds },
      $or: [
        { assignedTo: userId },
        { assignedBy: userId }
      ]
    });

    if (tasks.length !== taskIds.length) {
      throw new AppError('Not authorized to update some tasks', 403, 'NOT_AUTHORIZED');
    }

    // Update all tasks
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        taskIds
      },
      message: `Updated ${result.modifiedCount} tasks to ${status}`
    });
  }

  // Helper method: Check for circular dependency
  async hasCircularDependency(task, dependencyId) {
    const visited = new Set();
    
    const checkDependencies = async (currentTaskId) => {
      if (visited.has(currentTaskId.toString())) {
        return true; // Circular dependency found
      }
      
      visited.add(currentTaskId.toString());
      
      const currentTask = await Task.findById(currentTaskId);
      if (!currentTask) return false;
      
      for (const depId of currentTask.dependencies) {
        if (depId.toString() === task._id.toString()) {
          return true; // Circular dependency found
        }
        
        if (await checkDependencies(depId)) {
          return true;
        }
      }
      
      return false;
    };
    
    return await checkDependencies(dependencyId);
  }

  // Helper method: Send status update notification
  async sendStatusUpdateNotification(task, oldStatus) {
    const assigner = await User.findById(task.assignedBy);
    const assignee = await User.findById(task.assignedTo);

    if (assigner && assignee) {
      await EmailService.sendTaskStatusUpdate({
        to: [assigner.email, assignee.email].filter(email => email !== req.user.email),
        task,
        oldStatus,
        newStatus: task.status,
        updatedBy: req.user
      });
    }
  }
}

module.exports = new TaskController();
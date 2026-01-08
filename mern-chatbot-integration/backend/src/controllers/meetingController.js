const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');
const OpenAIService = require('../services/ai/openAIService');
const EmailService = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');

class MeetingController {
  // Get user's meetings with filters
  async getMeetings(req, res) {
    const userId = req.user.id;
    const {
      status,
      startDate,
      endDate,
      search,
      limit = 20,
      page = 1
    } = req.query;

    // Build query
    const query = {
      $or: [
        { organizer: userId },
        { 'participants.userId': userId }
      ]
    };

    // Apply filters
    if (status) query.status = status;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    // Apply search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .populate('organizer', 'name email')
        .populate('participants.userId', 'name email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Meeting.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  }

  // Get upcoming meetings
  async getUpcomingMeetings(req, res) {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    const meetings = await Meeting.find({
      $or: [
        { organizer: userId },
        { 'participants.userId': userId }
      ],
      startTime: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'scheduled'
    })
    .populate('organizer', 'name email')
    .populate('participants.userId', 'name email')
    .sort({ startTime: 1 });

    res.json({
      success: true,
      data: meetings
    });
  }

  // Get meeting by ID
  async getMeetingById(req, res) {
    const meeting = req.meeting;

    // Populate additional data
    await meeting.populate('organizer', 'name email avatar');
    await meeting.populate('participants.userId', 'name email avatar');
    
    // Get related tasks
    const tasks = await Task.find({ meeting: meeting._id })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    res.json({
      success: true,
      data: {
        ...meeting.toObject(),
        tasks
      }
    });
  }

  // Create new meeting
  async createMeeting(req, res) {
    const userId = req.user.id;
    const {
      title,
      description,
      startTime,
      endTime,
      participants = [],
      agenda = [],
      location
    } = req.body;

    // Validate time
    if (new Date(startTime) >= new Date(endTime)) {
      throw new AppError('End time must be after start time', 400, 'INVALID_TIME');
    }

    // Create meeting
    const meeting = new Meeting({
      title,
      description,
      startTime,
      endTime,
      organizer: userId,
      participants: participants.map(email => ({
        email,
        status: 'invited'
      })),
      agenda,
      location,
      status: 'scheduled'
    });

    await meeting.save();

    // Send invitations
    await this.sendMeetingInvitations(meeting);

    // Generate Google Calendar event if integrated
    if (req.user.integrations?.googleCalendar?.accessToken) {
      await this.createGoogleCalendarEvent(meeting, req.user);
    }

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully'
    });
  }

  // Update meeting
  async updateMeeting(req, res) {
    const meeting = req.meeting;
    const updates = req.body;

    // Validate updates
    const allowedUpdates = [
      'title', 'description', 'startTime', 'endTime',
      'participants', 'agenda', 'location', 'status'
    ];

    const isValidUpdate = Object.keys(updates).every(key => 
      allowedUpdates.includes(key)
    );

    if (!isValidUpdate) {
      throw new AppError('Invalid updates', 400, 'INVALID_UPDATES');
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      meeting[key] = updates[key];
    });

    await meeting.save();

    // Send updates if meeting time changed
    if (updates.startTime || updates.endTime || updates.participants) {
      await this.sendMeetingUpdates(meeting);
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully'
    });
  }

  // Delete meeting
  async deleteMeeting(req, res) {
    const meeting = req.meeting;

    // Delete related tasks
    await Task.deleteMany({ meeting: meeting._id });

    // Delete from Google Calendar if integrated
    if (meeting.googleCalendarEventId && req.user.integrations?.googleCalendar) {
      await this.deleteGoogleCalendarEvent(meeting, req.user);
    }

    await meeting.deleteOne();

    // Send cancellation notifications
    await this.sendMeetingCancellation(meeting);

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  }

  // Generate meeting summary
  async generateSummary(req, res) {
    const meeting = req.meeting;
    const { transcript, actionItems } = req.body;

    let summary = meeting.summary;
    let extractedActionItems = meeting.actionItems || [];

    // If transcript provided, generate summary
    if (transcript) {
      const aiSummary = await OpenAIService.generateMeetingSummary(transcript, {
        title: meeting.title,
        date: meeting.startTime,
        participants: meeting.participants.map(p => p.email)
      });

      summary = aiSummary.summary || transcript;
      meeting.transcript = transcript;

      // Extract action items from transcript
      if (!actionItems) {
        const extracted = await OpenAIService.extractActionItems(transcript);
        extractedActionItems = extracted;
      }
    }

    // Use provided action items or extracted ones
    if (actionItems) {
      extractedActionItems = actionItems;
    }

    // Update meeting
    meeting.summary = summary;
    meeting.actionItems = extractedActionItems;

    // Create tasks from action items
    if (extractedActionItems.length > 0) {
      await this.createTasksFromActionItems(meeting, extractedActionItems);
    }

    await meeting.save();

    res.json({
      success: true,
      data: {
        summary,
        actionItems: extractedActionItems
      },
      message: 'Meeting summary generated successfully'
    });
  }

  // Upload transcript
  async uploadTranscript(req, res) {
    const meeting = req.meeting;
    const { transcript } = req.body;

    meeting.transcript = transcript;
    await meeting.save();

    res.json({
      success: true,
      message: 'Transcript uploaded successfully'
    });
  }

  // Add action items
  async addActionItems(req, res) {
    const meeting = req.meeting;
    const { actionItems } = req.body;

    const currentActionItems = meeting.actionItems || [];
    meeting.actionItems = [...currentActionItems, ...actionItems];

    await meeting.save();

    // Create tasks
    await this.createTasksFromActionItems(meeting, actionItems);

    res.json({
      success: true,
      data: meeting.actionItems,
      message: 'Action items added successfully'
    });
  }

  // Send reminders
  async sendReminders(req, res) {
    const meeting = req.meeting;

    // Check if meeting is upcoming
    const timeUntilMeeting = meeting.startTime - new Date();
    const hoursUntilMeeting = timeUntilMeeting / (1000 * 60 * 60);

    if (hoursUntilMeeting < 0) {
      throw new AppError('Meeting has already occurred', 400, 'MEETING_PASSED');
    }

    // Send reminders
    const remindersSent = await this.sendMeetingReminders(meeting);

    res.json({
      success: true,
      data: { remindersSent },
      message: 'Reminders sent successfully'
    });
  }

  // Helper method: Send meeting invitations
  async sendMeetingInvitations(meeting) {
    const participants = meeting.participants;
    
    for (const participant of participants) {
      await EmailService.sendMeetingInvitation({
        to: participant.email,
        meeting,
        organizer: meeting.organizer
      });
    }
  }

  // Helper method: Create tasks from action items
  async createTasksFromActionItems(meeting, actionItems) {
    const tasks = [];

    for (const item of actionItems) {
      // Find user by email
      const user = await User.findOne({ email: item.responsiblePerson });
      
      if (user) {
        const task = new Task({
          title: item.description,
          description: `From meeting: ${meeting.title}`,
          assignedTo: user._id,
          assignedBy: meeting.organizer,
          meeting: meeting._id,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          priority: item.priority || 'medium',
          status: 'todo'
        });

        await task.save();
        tasks.push(task);
      }
    }

    return tasks;
  }

  // Helper method: Send meeting updates
  async sendMeetingUpdates(meeting) {
    const participants = meeting.participants;
    
    for (const participant of participants) {
      await EmailService.sendMeetingUpdate({
        to: participant.email,
        meeting,
        organizer: meeting.organizer
      });
    }
  }

  // Helper method: Send meeting cancellation
  async sendMeetingCancellation(meeting) {
    const participants = meeting.participants;
    
    for (const participant of participants) {
      await EmailService.sendMeetingCancellation({
        to: participant.email,
        meeting,
        organizer: meeting.organizer
      });
    }
  }

  // Helper method: Send meeting reminders
  async sendMeetingReminders(meeting) {
    const participants = meeting.participants;
    const remindersSent = [];
    
    for (const participant of participants) {
      if (participant.status === 'accepted') {
        await EmailService.sendMeetingReminder({
          to: participant.email,
          meeting
        });
        remindersSent.push(participant.email);
      }
    }

    return remindersSent;
  }

  // Helper method: Create Google Calendar event
  async createGoogleCalendarEvent(meeting, user) {
    try {
      // Implementation depends on your Google Calendar integration
      // This is a placeholder
      console.log('Creating Google Calendar event for meeting:', meeting._id);
      return { eventId: 'mock-event-id' };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
    }
  }

  // Helper method: Delete Google Calendar event
  async deleteGoogleCalendarEvent(meeting, user) {
    try {
      // Implementation depends on your Google Calendar integration
      console.log('Deleting Google Calendar event:', meeting.googleCalendarEventId);
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
    }
  }

  // Get meeting participants
  async getParticipants(req, res) {
    const meeting = req.meeting;
    
    // Populate participant details
    await meeting.populate('participants.userId', 'name email avatar');
    
    res.json({
      success: true,
      data: meeting.participants
    });
  }

  // Add participants to meeting
  async addParticipants(req, res) {
    const meeting = req.meeting;
    const { participants } = req.body;

    // Add new participants
    const newParticipants = participants.map(email => ({
      email,
      status: 'invited'
    }));

    meeting.participants = [...meeting.participants, ...newParticipants];
    await meeting.save();

    // Send invitations to new participants
    for (const participant of newParticipants) {
      await EmailService.sendMeetingInvitation({
        to: participant.email,
        meeting,
        organizer: meeting.organizer
      });
    }

    res.json({
      success: true,
      data: meeting.participants,
      message: 'Participants added successfully'
    });
  }

  // Update participant status
  async updateParticipantStatus(req, res) {
    const meeting = req.meeting;
    const { participantId } = req.params;
    const { status } = req.body;

    const participant = meeting.participants.id(participantId);
    
    if (!participant) {
      throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
    }

    participant.status = status;
    await meeting.save();

    res.json({
      success: true,
      data: participant,
      message: 'Participant status updated successfully'
    });
  }
}

module.exports = new MeetingController();
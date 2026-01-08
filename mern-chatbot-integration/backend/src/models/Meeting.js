const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: String,
        name: String,
        status: {
            type: String,
            enum: ['invited', 'accepted', 'declined', 'tentative'],
            default: 'invited'
        }
    }],
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    agenda: [{
        topic: String,
        duration: Number,
        presenter: String
    }],
    summary: {
        type: String,
        trim: true
    },
    actionItems: [{
        description: String,
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        dueDate: Date,
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending'
        }
    }],
    transcript: {
        type: String
    },
    recordingUrl: {
        type: String
    },
    googleCalendarEventId: {
        type: String
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better query performance
meetingSchema.index({ organizer: 1, startTime: 1 });
meetingSchema.index({ 'participants.userId': 1, startTime: 1 });
meetingSchema.index({ status: 1, startTime: 1 });

// Virtual for duration
meetingSchema.virtual('duration').get(function() {
    return (this.endTime - this.startTime) / (1000 * 60); // in minutes
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
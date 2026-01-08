const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'manager'],
        default: 'user'
    },
    department: {
        type: String
    },
    position: {
        type: String
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            reminders: { type: Boolean, default: true }
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '17:00' }
        },
        chatSettings: {
            autoRespond: { type: Boolean, default: false },
            language: { type: String, default: 'en' },
            theme: { type: String, default: 'light' }
        }
    },
    integrations: {
        googleCalendar: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date,
            calendarId: String
        },
        microsoftTeams: {
            accessToken: String,
            refreshToken: String,
            expiresAt: Date
        }
    },
    aiAssistant: {
        conversationHistory: [{
            message: String,
            sender: String, // 'user' or 'assistant'
            timestamp: Date,
            context: mongoose.Schema.Types.Mixed
        }],
        preferences: {
            personality: {
                type: String,
                enum: ['professional', 'friendly', 'concise'],
                default: 'professional'
            },
            verbosity: {
                type: String,
                enum: ['detailed', 'brief'],
                default: 'detailed'
            }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastActive: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return this.name;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
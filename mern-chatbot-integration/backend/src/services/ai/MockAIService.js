class MockAIService {
    constructor() {
        this.available = true;
        console.log('✅ Mock AI service initialized');
    }

    isAvailable() {
        return true;
    }

    async generateResponse(query, user, context = {}) {
        console.log('🤖 Mock AI: Processing query');
        
        // Simple intent detection
        const intent = this.detectIntent(query);
        
        // Generate mock response based on intent
        const responses = {
            'greeting': `Hello ${user.name}! I'm your AI assistant. How can I help you today?`,
            'meeting_schedule': "I can help schedule a meeting. What's the meeting about and when would you like to schedule it?",
            'task_create': "I can create a task for you. What should I call the task and when is it due?",
            'meeting_query': "I can check your meetings. What timeframe are you interested in?",
            'task_query': "I can show your tasks. Would you like to see pending, completed, or all tasks?",
            'default': "I understand you're asking about: " + query + ". I can help with scheduling meetings, creating tasks, setting reminders, and answering questions about your schedule."
        };

        const response = responses[intent] || responses.default;

        return {
            response: response,
            intent: intent,
            data: {},
            suggestions: this.generateSuggestions(intent),
            requiresFollowUp: intent === 'meeting_schedule' || intent === 'task_create',
            followUpQuestions: this.getFollowUpQuestions(intent),
            provider: 'mock'
        };
    }

    async generateMeetingSummary(transcript, meetingContext = {}) {
        return {
            summary: `Meeting summary (mock): ${transcript.substring(0, 200)}...`,
            keyPoints: ['Discussion point 1', 'Discussion point 2'],
            actionItems: [
                {
                    description: 'Follow up on action item',
                    responsiblePerson: 'team@example.com',
                    deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                    priority: 'medium'
                }
            ],
            decisions: ['Decision made'],
            nextSteps: ['Schedule follow-up']
        };
    }

    async extractActionItems(transcript) {
        return [
            {
                description: 'Complete the report',
                responsiblePerson: 'user@example.com',
                deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                priority: 'high'
            },
            {
                description: 'Schedule follow-up meeting',
                responsiblePerson: 'team@example.com',
                deadline: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                priority: 'medium'
            }
        ];
    }

    async scheduleMeeting(userPrompt, user) {
        return {
            title: 'Team Meeting',
            description: 'Discussion based on: ' + userPrompt,
            proposedTimes: [
                new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                new Date(Date.now() + 86400000 * 2).toISOString() // Day after
            ],
            duration: 60,
            participants: [user.email],
            agenda: ['General discussion'],
            location: 'Virtual',
            priority: 'medium'
        };
    }

    async createTask(userPrompt, user) {
        return {
            title: 'New Task',
            description: userPrompt,
            assignedTo: user.email,
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            priority: 'medium',
            tags: ['general'],
            estimatedHours: 2
        };
    }

    async analyzeQuery(query, user, context = {}) {
        const intent = this.detectIntent(query);
        
        return {
            intent: intent,
            confidence: 0.8,
            requiresFollowUp: intent === 'meeting_schedule' || intent === 'task_create',
            followUpQuestions: this.getFollowUpQuestions(intent),
            suggestedActions: this.generateSuggestions(intent),
            canAutomate: intent === 'meeting_schedule' || intent === 'task_create',
            entities: {
                dates: [],
                people: [],
                tasks: [],
                meetings: []
            }
        };
    }

    async chatCompletion(messages, user) {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const response = `Mock response to: ${lastMessage.substring(0, 50)}...`;
        
        return {
            content: response,
            role: 'assistant'
        };
    }

    // Helper methods
    detectIntent(query) {
        const queryLower = query.toLowerCase();
        
        if (queryLower.includes('hello') || queryLower.includes('hi')) return 'greeting';
        if (queryLower.includes('meeting') && queryLower.includes('schedule')) return 'meeting_schedule';
        if (queryLower.includes('meeting')) return 'meeting_query';
        if (queryLower.includes('task') || queryLower.includes('todo')) return 'task_create';
        if (queryLower.includes('remind')) return 'reminder_set';
        if (queryLower.includes('what') || queryLower.includes('show')) return 'data_query';
        
        return 'default';
    }

    generateSuggestions(intent) {
        const suggestions = {
            'meeting_schedule': ['Schedule for tomorrow', 'Add participants', 'Set agenda'],
            'task_create': ['Set deadline', 'Add description', 'Assign to someone'],
            'meeting_query': ['View upcoming', 'Check past meetings', 'Export schedule'],
            'task_query': ['View pending', 'Check completed', 'Filter by priority'],
            'default': ['Schedule meeting', 'Create task', 'Set reminder', 'View schedule']
        };
        
        return suggestions[intent] || suggestions.default;
    }

    getFollowUpQuestions(intent) {
        const questions = {
            'meeting_schedule': ['What is the meeting about?', 'When should we schedule it?', 'Who should attend?'],
            'task_create': ['What is the task title?', 'When is it due?', 'What is the priority?'],
            'default': ['Can you provide more details?']
        };
        
        return questions[intent] || questions.default;
    }
}

module.exports = MockAIService;
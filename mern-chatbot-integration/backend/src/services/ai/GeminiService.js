const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.genAI = null;
        this.model = null;
        this.available = false;
        
        this.initialize();
    }

    initialize() {
        try {
            if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
                console.log('⚠️  Gemini API key not configured');
                return;
            }

            this.genAI = new GoogleGenerativeAI(this.apiKey);
            
            // Use Gemini Pro (free tier allows 60 requests per minute)
            this.model = this.genAI.getGenerativeModel({ 
                model: "gemini-pro",
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            });
            
            this.available = true;
            console.log('✅ Gemini AI service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Gemini:', error.message);
            this.available = false;
        }
    }

    isAvailable() {
        return this.available;
    }

    async generateResponse(query, user, context = {}) {
        if (!this.isAvailable()) {
            throw new Error('Gemini service not available');
        }

        try {
            // Get user context
            const userContext = await this.getUserContext(user);
            
            const prompt = this.buildChatPrompt(query, user, context, userContext);
            
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            // Parse response for structured data
            const parsedResponse = this.parseAIResponse(text);
            
            return {
                response: parsedResponse.message,
                intent: parsedResponse.intent || 'general_assistance',
                data: parsedResponse.data || {},
                suggestions: parsedResponse.suggestions || [],
                requiresFollowUp: parsedResponse.requiresFollowUp || false,
                followUpQuestions: parsedResponse.followUpQuestions || [],
                provider: 'gemini'
            };
        } catch (error) {
            console.error('Gemini API error:', error);
            
            // Check for rate limiting
            if (error.message.includes('quota') || error.message.includes('rate limit')) {
                console.log('⚠️  Gemini rate limit reached, will try other providers');
                throw new Error('Gemini rate limit exceeded');
            }
            
            throw error;
        }
    }

    async generateMeetingSummary(transcript, meetingContext = {}) {
        if (!this.isAvailable()) throw new Error('Gemini not available');

        const prompt = `
            Analyze this meeting transcript and generate a structured summary.
            
            MEETING DETAILS:
            Title: ${meetingContext.title || 'Meeting'}
            Date: ${meetingContext.date || 'Unknown'}
            Participants: ${meetingContext.participants?.join(', ') || 'Unknown'}
            
            TRANSCRIPT:
            ${transcript.substring(0, 10000)}  # Limit for Gemini
            
            Please provide a JSON response with:
            1. executiveSummary: Brief overview (2-3 sentences)
            2. keyPoints: Array of main discussion points
            3. decisions: Array of decisions made
            4. actionItems: Array of {description, responsiblePerson, deadline, priority}
            5. nextSteps: Array of follow-up actions
            
            Return ONLY valid JSON.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback to simple parsing
            return {
                summary: text.substring(0, 500),
                actionItems: [],
                keyPoints: []
            };
        } catch (error) {
            console.error('Gemini summary error:', error);
            throw error;
        }
    }

    async extractActionItems(transcript) {
        if (!this.isAvailable()) throw new Error('Gemini not available');

        const prompt = `
            Extract action items from this meeting transcript.
            Format as JSON array: [{"description": "", "responsiblePerson": "", "deadline": "", "priority": ""}]
            
            Transcript: ${transcript.substring(0, 8000)}
            
            Return ONLY JSON.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            console.error('Gemini action items error:', error);
            return [];
        }
    }

    async scheduleMeeting(userPrompt, user) {
        if (!this.isAvailable()) throw new Error('Gemini not available');

        const prompt = `
            Parse this meeting scheduling request into structured JSON.
            
            Request: "${userPrompt}"
            Current User: ${user.name} (${user.email})
            Current Time: ${new Date().toISOString()}
            
            Extract:
            1. title: Meeting title
            2. description: Purpose/agenda
            3. proposedTimes: Array of ISO date strings
            4. duration: Minutes (default 60)
            5. participants: Array of emails
            6. agenda: Array of topics
            7. location: Meeting location
            8. priority: high/medium/low
            
            Return ONLY JSON with these fields.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback
            return {
                title: 'New Meeting',
                description: userPrompt,
                proposedTimes: [new Date(Date.now() + 86400000).toISOString()], // Tomorrow
                duration: 60,
                participants: [user.email],
                agenda: ['General discussion'],
                location: 'Virtual',
                priority: 'medium'
            };
        } catch (error) {
            console.error('Gemini meeting parsing error:', error);
            throw error;
        }
    }

    async analyzeQuery(query, user, context = {}) {
        if (!this.isAvailable()) throw new Error('Gemini not available');

        const prompt = `
            Analyze this user query for intent classification.
            
            Query: "${query}"
            User Context: ${JSON.stringify(context)}
            
            Classify intent into one of:
            - meeting_schedule (schedule/create meeting)
            - meeting_query (questions about meetings)
            - task_create (create task)
            - task_query (questions about tasks)
            - reminder_set (set reminder)
            - data_query (general data questions)
            - summary_request (summarize info)
            - general_assistance (help/instructions)
            
            Return JSON with:
            {
                "intent": "classified_intent",
                "confidence": 0.0-1.0,
                "requiresFollowUp": true/false,
                "followUpQuestions": ["question1", "question2"],
                "suggestedActions": ["action1", "action2"],
                "canAutomate": true/false
            }
            
            Return ONLY JSON.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback analysis
            return {
                intent: this.guessIntent(query),
                confidence: 0.7,
                requiresFollowUp: true,
                followUpQuestions: ['Can you provide more details?'],
                suggestedActions: [],
                canAutomate: false
            };
        } catch (error) {
            console.error('Gemini query analysis error:', error);
            throw error;
        }
    }

    async chatCompletion(messages, user) {
        if (!this.isAvailable()) throw new Error('Gemini not available');

        try {
            // Convert messages to Gemini format
            const chat = this.model.startChat({
                history: messages.slice(0, -1).map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                })),
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            });

            const lastMessage = messages[messages.length - 1];
            const result = await chat.sendMessage(lastMessage.content);
            const response = result.response;
            
            return {
                content: response.text(),
                role: 'model'
            };
        } catch (error) {
            console.error('Gemini chat completion error:', error);
            throw error;
        }
    }

    // Helper methods
    async getUserContext(user) {
        // Mock implementation - replace with actual data fetching
        return {
            name: user.name,
            email: user.email,
            preferences: user.aiAssistant?.preferences || {}
        };
    }

    buildChatPrompt(query, user, context, userContext) {
        return `
            You are an AI productivity assistant helping ${userContext.name}.
            
            USER QUERY: ${query}
            
            CONVERSATION CONTEXT: ${JSON.stringify(context.history || [])}
            
            USER PREFERENCES: ${JSON.stringify(userContext.preferences || {})}
            
            INSTRUCTIONS:
            1. Respond helpfully and concisely
            2. If the query is about scheduling meetings or tasks, ask for missing details
            3. Provide structured information when appropriate
            4. Suggest relevant follow-up actions
            5. Maintain a professional but friendly tone
            
            IMPORTANT: If the query can be automated (like scheduling a meeting), 
            indicate that in your response and ask for confirmation.
            
            Your response should include:
            - Direct answer to the query
            - Any follow-up questions needed
            - Suggested next actions
            - Clear indication of what can be automated
        `;
    }

    parseAIResponse(text) {
        try {
            // Try to extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    message: parsed.message || text,
                    intent: parsed.intent,
                    data: parsed.data,
                    suggestions: parsed.suggestions,
                    requiresFollowUp: parsed.requiresFollowUp,
                    followUpQuestions: parsed.followUpQuestions
                };
            }
        } catch (error) {
            // If JSON parsing fails, return plain text
        }

        // Default response
        return {
            message: text,
            intent: 'general_assistance',
            data: {},
            suggestions: [],
            requiresFollowUp: false,
            followUpQuestions: []
        };
    }

    guessIntent(query) {
        const queryLower = query.toLowerCase();
        
        if (queryLower.includes('meeting') && queryLower.includes('schedule')) 
            return 'meeting_schedule';
        if (queryLower.includes('meeting')) 
            return 'meeting_query';
        if (queryLower.includes('task') || queryLower.includes('todo')) 
            return 'task_create';
        if (queryLower.includes('remind')) 
            return 'reminder_set';
        if (queryLower.includes('what') || queryLower.includes('show') || queryLower.includes('get')) 
            return 'data_query';
        if (queryLower.includes('summar')) 
            return 'summary_request';
        
        return 'general_assistance';
    }

    // Rate limiting helper
    async checkRateLimit() {
        // Simple rate limiting - you can implement more sophisticated logic
        const now = Date.now();
        if (!this.lastRequestTime) {
            this.lastRequestTime = now;
            return true;
        }
        
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < 1000) { // 1 request per second max
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
        }
        
        this.lastRequestTime = Date.now();
        return true;
    }
}

module.exports = GeminiService;
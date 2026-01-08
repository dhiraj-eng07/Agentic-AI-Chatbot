const { OpenAI } = require('openai');

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.openai = null;
        this.available = false;
        this.initialize();
    }

    initialize() {
        try {
            if (!this.apiKey || this.apiKey.includes('your_actual')) {
                console.log('⚠️  OpenAI API key not configured');
                return;
            }

            this.openai = new OpenAI({
                apiKey: this.apiKey,
                timeout: 30000,
                maxRetries: 2
            });
            
            this.available = true;
            console.log('✅ OpenAI service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize OpenAI:', error.message);
            this.available = false;
        }
    }

    isAvailable() {
        return this.available;
    }

    async generateResponse(query, user, context = {}) {
        if (!this.isAvailable()) {
            throw new Error('OpenAI service not available');
        }

        try {
            const analysis = await this.analyzeQuery(query, user, context);
            
            const prompt = this.buildResponsePrompt(query, analysis, {}, user);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // Cheaper than GPT-4
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an AI productivity assistant.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return {
                response: response.choices[0].message.content,
                intent: analysis.intent,
                data: {},
                suggestions: analysis.suggestedActions || [],
                requiresFollowUp: analysis.requiresFollowUp || false,
                followUpQuestions: analysis.followUpQuestions || [],
                provider: 'openai'
            };
        } catch (error) {
            console.error('OpenAI API error:', error);
            
            // Check for billing/credit issues
            if (error.message.includes('insufficient_quota') || error.message.includes('billing')) {
                console.log('⚠️  OpenAI billing/quota issue, will try other providers');
                throw new Error('OpenAI quota exceeded');
            }
            
            throw error;
        }
    }

    async generateMeetingSummary(transcript, meetingContext = {}) {
        if (!this.isAvailable()) throw new Error('OpenAI not available');

        const prompt = `
            Generate meeting summary from transcript.
            
            Meeting: ${meetingContext.title || 'Meeting'}
            
            Transcript: ${transcript.substring(0, 4000)}
            
            Return JSON with: summary, actionItems, keyPoints
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Generate meeting summaries' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('OpenAI summary error:', error);
            throw error;
        }
    }

    async extractActionItems(transcript) {
        if (!this.isAvailable()) throw new Error('OpenAI not available');

        const prompt = `
            Extract action items from meeting transcript.
            Return JSON array.
            
            Transcript: ${transcript.substring(0, 3000)}
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Extract action items' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.choices[0].message.content);
            return result.actionItems || [];
        } catch (error) {
            console.error('OpenAI action items error:', error);
            return [];
        }
    }

    async scheduleMeeting(userPrompt, user) {
        if (!this.isAvailable()) throw new Error('OpenAI not available');

        const prompt = `
            Parse meeting request: "${userPrompt}"
            Return JSON with: title, description, proposedTimes[], duration, participants[], agenda[], location, priority
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Parse meeting details' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('OpenAI meeting parsing error:', error);
            throw error;
        }
    }

    async analyzeQuery(query, user, context = {}) {
        if (!this.isAvailable()) throw new Error('OpenAI not available');

        const prompt = `
            Analyze query: "${query}"
            Context: ${JSON.stringify(context)}
            
            Return JSON with: intent, confidence, requiresFollowUp, followUpQuestions[], suggestedActions[], canAutomate
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Analyze query intent' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 300,
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('OpenAI analysis error:', error);
            throw error;
        }
    }

    async chatCompletion(messages, user) {
        if (!this.isAvailable()) throw new Error('OpenAI not available');

        const chatMessages = [
            { role: 'system', content: 'You are an AI assistant.' },
            ...messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        ];

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: chatMessages,
                temperature: 0.7,
                max_tokens: 500
            });

            return response.choices[0].message;
        } catch (error) {
            console.error('OpenAI chat error:', error);
            throw error;
        }
    }

    buildResponsePrompt(query, analysis, data, user) {
        return `
            Query: "${query}"
            Intent: ${analysis.intent}
            Requires Follow-up: ${analysis.requiresFollowUp}
            Missing Info: ${analysis.followUpQuestions?.join(', ') || 'None'}
            
            User: ${user.name}
            
            Provide helpful response. ${analysis.requiresFollowUp ? 'Ask the follow-up questions.' : 'Give complete answer.'}
        `;
    }
}

module.exports = OpenAIService;
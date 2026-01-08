const OpenAIService = require('./OpenAIService');
const GeminiService = require('./GeminiService');
const MockAIService = require('./MockAIService');

class AIService {
    constructor() {
        this.providers = [];
        this.activeProvider = null;
        this.initializeProviders();
    }

    initializeProviders() {
        // Try providers in order of preference (free first)
        try {
            // 1. Try Gemini (FREE)
            const geminiService = new GeminiService();
            if (geminiService.isAvailable()) {
                this.providers.push({
                    name: 'gemini',
                    service: geminiService,
                    priority: 1,
                    cost: 'free'
                });
                console.log('✅ Gemini AI provider initialized');
            }
        } catch (error) {
            console.log('⚠️  Gemini provider unavailable:', error.message);
        }

        try {
            // 2. Try OpenAI
            const openaiService = new OpenAIService();
            if (openaiService.isAvailable()) {
                this.providers.push({
                    name: 'openai',
                    service: openaiService,
                    priority: 2,
                    cost: 'paid'
                });
                console.log('✅ OpenAI provider initialized');
            }
        } catch (error) {
            console.log('⚠️  OpenAI provider unavailable:', error.message);
        }

        // 3. Always add mock service as fallback
        this.providers.push({
            name: 'mock',
            service: new MockAIService(),
            priority: 3,
            cost: 'free'
        });
        console.log('✅ Mock AI provider initialized (fallback)');

        // Sort by priority (free/lowest cost first)
        this.providers.sort((a, b) => a.priority - b.priority);
        this.activeProvider = this.providers[0]?.service;
        
        console.log(`🎯 Active AI provider: ${this.providers[0]?.name}`);
    }

    async generateResponse(query, user, context = {}) {
        // Try providers in order until one works
        for (const provider of this.providers) {
            try {
                console.log(`🤖 Trying ${provider.name} provider...`);
                const response = await provider.service.generateResponse(query, user, context);
                
                // Log which provider was used
                response.provider = provider.name;
                response.cost = provider.cost;
                
                console.log(`✅ Response generated using ${provider.name} (${provider.cost})`);
                return response;
            } catch (error) {
                console.log(`❌ ${provider.name} failed:`, error.message);
                
                // If it's not the last provider, try the next one
                if (provider.name !== 'mock') {
                    console.log(`🔄 Falling back to next provider...`);
                    continue;
                }
                
                // If even mock fails, return error
                throw new Error(`All AI providers failed: ${error.message}`);
            }
        }
    }

    async generateMeetingSummary(transcript, meetingContext = {}) {
        for (const provider of this.providers) {
            try {
                const summary = await provider.service.generateMeetingSummary(transcript, meetingContext);
                summary.provider = provider.name;
                return summary;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    async extractActionItems(transcript) {
        for (const provider of this.providers) {
            try {
                const items = await provider.service.extractActionItems(transcript);
                return items;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    async scheduleMeeting(userPrompt, user) {
        for (const provider of this.providers) {
            try {
                const details = await provider.service.scheduleMeeting(userPrompt, user);
                return details;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    async createTask(userPrompt, user) {
        for (const provider of this.providers) {
            try {
                const details = await provider.service.createTask(userPrompt, user);
                return details;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    async analyzeQuery(query, user, context = {}) {
        for (const provider of this.providers) {
            try {
                const analysis = await provider.service.analyzeQuery(query, user, context);
                return analysis;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    async chatCompletion(messages, user) {
        for (const provider of this.providers) {
            try {
                const response = await provider.service.chatCompletion(messages, user);
                return response;
            } catch (error) {
                if (provider.name !== 'mock') continue;
                throw error;
            }
        }
    }

    // Get provider statistics
    getProviderStats() {
        return this.providers.map(p => ({
            name: p.name,
            priority: p.priority,
            cost: p.cost,
            available: p.service.isAvailable()
        }));
    }

    // Switch provider manually (for testing)
    switchProvider(providerName) {
        const provider = this.providers.find(p => p.name === providerName);
        if (provider) {
            this.activeProvider = provider.service;
            console.log(`🔄 Switched to ${providerName} provider`);
            return true;
        }
        return false;
    }
}

module.exports = new AIService();
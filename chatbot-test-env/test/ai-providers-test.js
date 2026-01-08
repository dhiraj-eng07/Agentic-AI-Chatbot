// Create test file: test-ai-providers.js
const AIService = require('./services/ai/AIService');

async function testAISystem() {
    console.log('🧪 Testing Multi-AI System\n');
    
    // Test user
    const testUser = {
        name: 'Test User',
        email: 'test@example.com',
        aiAssistant: {
            preferences: {
                personality: 'friendly'
            }
        }
    };
    
    // Test queries
    const testQueries = [
        "Hello, how are you?",
        "Schedule a team meeting for tomorrow",
        "Create a task to finish the report",
        "What meetings do I have this week?"
    ];
    
    console.log('Available Providers:');
    console.log(AIService.getProviderStats());
    console.log('\n' + '='.repeat(50) + '\n');
    
    for (const query of testQueries) {
        console.log(`📤 Query: "${query}"`);
        
        try {
            const response = await AIService.generateResponse(query, testUser, {});
            
            console.log(`🤖 Response (via ${response.provider}): ${response.response.substring(0, 100)}...`);
            console.log(`🎯 Intent: ${response.intent}`);
            console.log(`💰 Cost: ${response.cost}`);
            console.log('---\n');
        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('✅ AI System Test Complete');
}

testAISystem();
// Agent utilities for AI processing
class AgentManager {
  constructor() {
    this.agents = [];
  }
  
  registerAgent(agent) {
    this.agents.push(agent);
  }
  
  async processWithAgents(message) {
    for (const agent of this.agents) {
      const result = await agent.process(message);
      if (result) return result;
    }
    return null;
  }
}

module.exports = new AgentManager();
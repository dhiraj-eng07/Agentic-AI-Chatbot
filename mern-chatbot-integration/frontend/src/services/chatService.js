import api from './api';

const chatService = {
  sendMessage: async (message) => {
    const response = await api.post('/chat/send', { message });
    return response.data.response;
  },
  
  getChatHistory: async (userId) => {
    const response = await api.get(`/chat/history/${userId}`);
    return response.data;
  },
};

export { chatService };
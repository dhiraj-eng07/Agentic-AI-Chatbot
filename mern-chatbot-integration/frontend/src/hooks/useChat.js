import { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';

export const useChat = () => {
  const [messages, setMessages] = useState([]);

  const sendMessage = async (message) => {
    const newMessage = { text: message, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    
    try {
      const response = await chatService.sendMessage(message);
      const aiMessage = { text: response, sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return { messages, sendMessage };
};
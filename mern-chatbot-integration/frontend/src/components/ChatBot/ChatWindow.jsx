import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import QuickActions from './QuickActions';
import { useChat } from '../../hooks/useChat';

const ChatWindow = ({ onClose }) => {
  const { messages, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <button onClick={onClose}>X</button>
      </div>
      <MessageList messages={messages} />
      <QuickActions />
      <MessageInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
      />
    </div>
  );
};

export default ChatWindow;
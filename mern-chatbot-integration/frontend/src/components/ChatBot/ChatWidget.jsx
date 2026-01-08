import React, { useState } from 'react';
import ChatWindow from './ChatWindow';
import '../../styles/ChatBot.css';
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="chat-widget">
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close Chat' : 'Open Chat'}
      </button>
    </div>
  );
};

export default ChatWidget;
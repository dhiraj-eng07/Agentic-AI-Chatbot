import React, { useEffect, useRef } from 'react';
import { Bot, User, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import '../../styles/MessageList.css';

const MessageList = ({ messages, formatMessageData, user }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (message) => {
    if (message.isError) {
      return (
        <div className="message-error">
          <AlertCircle className="error-icon" />
          <span>{message.content}</span>
        </div>
      );
    }

    // Check if message contains structured data
    if (message.data && formatMessageData) {
      const formattedData = formatMessageData(message.data);
      if (formattedData) {
        return (
          <>
            <div className="message-text">{message.content}</div>
            {formattedData}
          </>
        );
      }
    }

    return <div className="message-text">{message.content}</div>;
  };

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-item ${message.sender}`}
        >
          <div className="message-avatar">
            {message.sender === 'assistant' ? (
              <div className="avatar assistant">
                <Bot className="w-5 h-5" />
              </div>
            ) : (
              <div className="avatar user">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
          
          <div className="message-content">
            <div className="message-header">
              <span className="message-sender">
                {message.sender === 'assistant' ? 'AI Assistant' : user?.name || 'You'}
              </span>
              <span className="message-time">
                <Clock className="w-3 h-3" />
                {formatTime(message.timestamp)}
              </span>
            </div>
            
            <div className="message-body">
              {renderMessageContent(message)}
            </div>

            {/* Suggestions if available */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="message-suggestions">
                <div className="suggestions-title">Suggested actions:</div>
                <div className="suggestions-list">
                  {message.suggestions.map((suggestion, index) => (
                    <span key={index} className="suggestion-tag">
                      {suggestion}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
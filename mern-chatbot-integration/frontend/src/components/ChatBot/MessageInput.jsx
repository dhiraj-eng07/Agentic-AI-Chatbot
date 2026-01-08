import React, { useState, useEffect } from 'react';
import { Send, Mic, MicOff, Paperclip, Smile } from 'lucide-react';
import '../../styles/MessageInput.css';

const MessageInput = ({
  value,
  onChange,
  onKeyPress,
  placeholder,
  disabled,
  onAudioRecord,
  onFileUpload,
  onEmojiSelect
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        if (onAudioRecord) {
          onAudioRecord(audioBlob);
        }
        setAudioChunks([]);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start recording timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Store timer for cleanup
      recorder.timer = timer;
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      // Clear timer
      if (mediaRecorder.timer) {
        clearInterval(mediaRecorder.timer);
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onKeyPress) {
        onKeyPress(e);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        if (mediaRecorder.timer) {
          clearInterval(mediaRecorder.timer);
        }
      }
    };
  }, [mediaRecorder, isRecording]);

  return (
    <div className="message-input-container">
      {/* Recording indicator */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-pulse"></div>
          <span className="recording-text">
            Recording... {formatRecordingTime(recordingTime)}
          </span>
          <button
            onClick={stopRecording}
            className="stop-recording-btn"
            aria-label="Stop recording"
          >
            Stop
          </button>
        </div>
      )}

      <div className="input-wrapper">
        {/* Left actions */}
        <div className="input-actions-left">
          <button
            type="button"
            className="action-btn"
            onClick={onEmojiSelect}
            aria-label="Add emoji"
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <label className="action-btn file-upload-label" aria-label="Upload file">
            <input
              type="file"
              onChange={handleFileUpload}
              className="file-upload-input"
              accept=".txt,.pdf,.doc,.docx,.mp3,.wav"
              disabled={disabled}
            />
            <Paperclip className="w-5 h-5" />
          </label>
        </div>

        {/* Text input */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isRecording}
          className="message-textarea"
          rows={1}
          aria-label="Type your message"
        />

        {/* Right actions */}
        <div className="input-actions-right">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`action-btn audio-btn ${isRecording ? 'recording' : ''}`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            disabled={disabled}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          <button
            type="submit"
            className="action-btn send-btn"
            aria-label="Send message"
            disabled={!value.trim() || disabled || isRecording}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Input hints */}
      <div className="input-hints">
        <span className="hint">Press Enter to send</span>
        <span className="hint">Shift + Enter for new line</span>
        <span className="hint">Click mic to record audio</span>
      </div>
    </div>
  );
};

export default MessageInput;
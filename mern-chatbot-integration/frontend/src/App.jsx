import React from 'react';
import ChatBot from './components/ChatBot/ChatWidget';
import './styles/ChatBot.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>MERN Chatbot Integration</h1>
      </header>
      <main>
        <ChatBot />
      </main>
    </div>
  );
}
<QuickActions 
  actions={['Schedule Meeting', 'Create Task', 'Set Reminder', 'Get Help']}
  onActionClick={(action) => {
    console.log('Action clicked:', action);
    // Handle the action here
  }}
/>
export default App;
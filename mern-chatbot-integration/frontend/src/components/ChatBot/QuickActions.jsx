import React from 'react';
import { Calendar, CheckSquare, Clock, MessageSquare, Users, FileText } from 'lucide-react';
import '../../styles/QuickActions.css';

const QuickActions = ({ 
  actions = [],  // Provide default value
  onActionClick = () => {},  // Provide default function
  theme = 'light' 
}) => {
  const getIconForAction = (action) => {
    if (!action) return <MessageSquare className="w-4 h-4" />;
    
    const lowerAction = action.toLowerCase();
    
    if (lowerAction.includes('meeting')) return <Calendar className="w-4 h-4" />;
    if (lowerAction.includes('task')) return <CheckSquare className="w-4 h-4" />;
    if (lowerAction.includes('reminder')) return <Clock className="w-4 h-4" />;
    if (lowerAction.includes('summary')) return <FileText className="w-4 h-4" />;
    if (lowerAction.includes('participant')) return <Users className="w-4 h-4" />;
    
    return <MessageSquare className="w-4 h-4" />;
  };

  const categorizeActions = (actions) => {
    // Ensure actions is an array
    if (!Array.isArray(actions)) {
      return {
        meetings: [],
        tasks: [],
        general: []
      };
    }

    const categories = {
      meetings: [],
      tasks: [],
      general: []
    };

    actions.forEach(action => {
      if (!action) return; // Skip null/undefined actions
      
      const lowerAction = action.toLowerCase();
      
      if (lowerAction.includes('meeting') || lowerAction.includes('schedule')) {
        categories.meetings.push(action);
      } else if (lowerAction.includes('task') || lowerAction.includes('todo')) {
        categories.tasks.push(action);
      } else {
        categories.general.push(action);
      }
    });

    return categories;
  };

  // Provide default actions if none are passed
  const defaultActions = [
    'Schedule Meeting',
    'Create Task',
    'Set Reminder',
    'Generate Summary',
    'Add Participants',
    'Get Help'
  ];

  const actionList = actions && actions.length > 0 ? actions : defaultActions;
  const categories = categorizeActions(actionList);

  return (
    <div className={`quick-actions ${theme === 'dark' ? 'dark' : ''}`}>
      <h3>Quick Actions</h3>
      <p className="actions-description">
        Click any action to quickly interact with the AI assistant
      </p>
      
      {categories.meetings.length > 0 && (
        <div className="action-category">
          <div className="category-header">
            <Calendar className="category-icon" />
            <span className="category-title">Meetings</span>
          </div>
          <div className="category-actions">
            {categories.meetings.map((action, index) => (
              <button
                key={`meeting-${index}`}
                className="action-btn"
                onClick={() => onActionClick(action)}
              >
                {getIconForAction(action)}
                <span>{action}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.tasks.length > 0 && (
        <div className="action-category">
          <div className="category-header">
            <CheckSquare className="category-icon" />
            <span className="category-title">Tasks</span>
          </div>
          <div className="category-actions">
            {categories.tasks.map((action, index) => (
              <button
                key={`task-${index}`}
                className="action-btn"
                onClick={() => onActionClick(action)}
              >
                {getIconForAction(action)}
                <span>{action}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.general.length > 0 && (
        <div className="action-category">
          <div className="category-header">
            <MessageSquare className="category-icon" />
            <span className="category-title">General</span>
          </div>
          <div className="category-actions">
            {categories.general.map((action, index) => (
              <button
                key={`general-${index}`}
                className="action-btn"
                onClick={() => onActionClick(action)}
              >
                {getIconForAction(action)}
                <span>{action}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;
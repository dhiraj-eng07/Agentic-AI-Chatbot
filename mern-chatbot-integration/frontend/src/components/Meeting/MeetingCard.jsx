import React from 'react';

const MeetingCard = ({ meeting }) => {
  return (
    <div className="meeting-card">
      <h4>{meeting.title}</h4>
      <p>{meeting.description}</p>
      <p>Start: {new Date(meeting.startTime).toLocaleString()}</p>
      <p>End: {new Date(meeting.endTime).toLocaleString()}</p>
      <p>Attendees: {meeting.attendees.join(', ')}</p>
    </div>
  );
};

export default MeetingCard;
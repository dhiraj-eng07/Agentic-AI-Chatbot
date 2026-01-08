import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useMeetings = () => {
  const [meetings, setMeetings] = useState([]);

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const createMeeting = async (meetingData) => {
    try {
      const response = await api.post('/meetings', meetingData);
      setMeetings(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  return { meetings, createMeeting, fetchMeetings };
};
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      setTasks(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const response = await api.put(`/tasks/${id}`, updates);
      setTasks(prev => prev.map(task => task._id === id ? response.data : task));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, createTask, updateTask, fetchTasks };
};
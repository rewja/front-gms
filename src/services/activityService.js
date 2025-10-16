import { api } from '../lib/api';

export const getPersonalActivities = async (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/activities/mine?${params.toString()}`);
  return response.data;
};

export const getAllActivities = async (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/activities?${params.toString()}`);
  return response.data;
};

export const getPersonalStats = async () => {
  const response = await api.get('/activities/stats');
  return response.data;
};

export const getSystemStats = async () => {
  const response = await api.get('/activities/stats');
  return response.data;
};

export const getUserSummary = async (userId) => {
  const response = await api.get(`/activities/user/${userId}/summary`);
  return response.data;
};

export const exportPersonalActivities = async (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/activities/export?${params.toString()}`);
  return response.data;
};

export const exportAllActivities = async (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/activities/export?${params.toString()}`);
  return response.data;
};

export const clearOldLogs = async (data) => {
  const response = await api.post('/activities/clear-old', data);
  return response.data;
};

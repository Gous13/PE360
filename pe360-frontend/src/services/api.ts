import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// API URL — points to Render backend
const API_BASE = import.meta.env.VITE_API_URL || 'https://pe360.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s timeout for Render free tier cold start
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

// Users (admin)
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getSummary: () => api.get('/students/admin/summary'),
};

// Students
export const studentsApi = {
  getByClass: (cls: string, section: string) =>
    api.get(`/students?class=${cls}&section=${section}`),
  getClasses: () => api.get('/students/classes'),
  importExcel: (formData: FormData) =>
    api.post('/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadTemplate: () =>
    api.get('/students/template', { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/students/${id}`),
  deleteByClass: (cls: string, section: string) =>
    api.delete(`/students?class=${cls}&section=${section}`),
};

// Timetable
export const timetableApi = {
  getAll: () => api.get('/timetable'),
  getToday: () => api.get('/timetable/today'),
  create: (data: any) => api.post('/timetable', data),
  update: (id: number, data: any) => api.put(`/timetable/${id}`, data),
  delete: (id: number) => api.delete(`/timetable/${id}`),
};

// Attendance
export const attendanceApi = {
  getSessions: (params?: any) => api.get('/attendance/sessions', { params }),
  getSession: (id: number) => api.get(`/attendance/sessions/${id}`),
  saveSession: (data: any) => api.post('/attendance/sessions', data),
  getHistory: (params: any) => api.get('/attendance/history', { params }),
  getMonthly: (cls: string, section: string, month: string) =>
    api.get(`/attendance/monthly?class=${cls}&section=${section}&month=${month}`),
  generatePdf: (params: any) =>
    api.get('/attendance/pdf', { params, responseType: 'blob' }),
};

// Important
export const importantApi = {
  getAll: () => api.get('/important'),
  create: (data: any) => api.post('/important', data),
  update: (id: number, data: any) => api.put(`/important/${id}`, data),
  delete: (id: number) => api.delete(`/important/${id}`),
  togglePin: (id: number) => api.patch(`/important/${id}/pin`),
};

// Audit logs (admin)
export const auditApi = {
  getAll: (params?: any) => api.get('/audit', { params }),
};

export default api;

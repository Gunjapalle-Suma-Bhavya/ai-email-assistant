import { request } from './api';

export const authService = {
  async signup(fullName, email, password) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: { full_name: fullName, email, password },
    });
    if (data?.access_token) {
      localStorage.setItem('aether_token', data.access_token);
      localStorage.setItem('aether_user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data?.access_token) {
      localStorage.setItem('aether_token', data.access_token);
      localStorage.setItem('aether_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    return await request('/auth/me');
  },

  logout() {
    localStorage.removeItem('aether_token');
    localStorage.removeItem('aether_user');
  },

  getUser() {
    try {
      const u = localStorage.getItem('aether_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('aether_token');
  },
};

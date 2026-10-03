import { request } from './api';

export const emailService = {
  async getEmails(folder = '', search = '', account = '') {
    const params = new URLSearchParams();
    if (folder) params.append('folder', folder);
    if (search) params.append('search', search);
    if (account) params.append('account', account);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await request(`/emails${query}`);
  },

  async getEmail(id) {
    return await request(`/emails/${id}`);
  },

  async createEmail(data) {
    return await request('/emails', {
      method: 'POST',
      body: data,
    });
  },

  async deleteEmail(id) {
    return await request(`/emails/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats() {
    return await request('/emails/stats/summary');
  },

  async resetData() {
    return await request('/emails/reset', {
      method: 'POST',
    });
  },

  async triageEmail(emailId) {
    return await request('/triage', {
      method: 'POST',
      body: { email_id: emailId },
    });
  },

  async triageAllUnread() {
    return await request('/triage/all', {
      method: 'POST',
    });
  },

  async syncGmail(maxResults = 10) {
    return await request(`/emails/sync-gmail?max_results=${maxResults}`, {
      method: 'POST',
    });
  },
};

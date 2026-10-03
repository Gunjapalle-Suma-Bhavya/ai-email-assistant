import { request } from './api';

export const preferenceService = {
  async getPreferences() {
    return await request('/memory');
  },

  async updatePreferences(data) {
    return await request('/memory', {
      method: 'POST',
      body: data,
    });
  },

  async resetPreferences() {
    return await request('/memory/reset', {
      method: 'POST',
    });
  },

  async getFeedbackHistory() {
    return await request('/feedback');
  },

  async submitFeedback(feedbackText, category = 'response_preferences') {
    return await request('/feedback', {
      method: 'POST',
      body: { feedback_text: feedbackText, category },
    });
  },
};

import { request } from './api';

export const calendarService = {
  async getEvents() {
    return await request('/calendar/events');
  },

  async createEvent(data) {
    return await request('/calendar/events', {
      method: 'POST',
      body: data,
    });
  },

  async confirmEvent(eventId) {
    return await request(`/calendar/events/${eventId}/confirm`, {
      method: 'POST',
    });
  },

  async syncGoogleCalendar() {
    return await request('/calendar/sync-google', {
      method: 'POST',
    });
  },
};

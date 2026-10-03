import { request } from './api';

export const draftService = {
  async getDrafts() {
    return await request('/drafts');
  },

  async generateDraft(emailId, customInstructions = null) {
    return await request('/hitl/draft', {
      method: 'POST',
      body: {
        email_id: emailId,
        custom_instructions: customInstructions,
      },
    });
  },

  async executeAction(payload) {
    // payload: { email_id, action: 'accept'|'edit'|'ignore'|'feedback', edited_subject, edited_body, user_feedback, calendar_event }
    return await request('/hitl/action', {
      method: 'POST',
      body: payload,
    });
  },
};

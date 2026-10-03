import { request } from './api';

export const accountService = {
  /**
   * Retrieve all connected accounts and active selection
   */
  async getAccounts() {
    return await request('/accounts');
  },

  /**
   * Switch the active account filter ('acc_...' or 'all')
   */
  async switchAccount(accountId) {
    return await request('/accounts/switch', {
      method: 'POST',
      body: { account_id: accountId },
    });
  },

  /**
   * Disconnect a linked secondary Google account
   */
  async disconnectAccount(accountId) {
    return await request(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get OAuth consent URL to link another Google account to current user
   */
  async getConnectUrl() {
    const res = await request('/auth/google/connect');
    return res.auth_url;
  },

  /**
   * Trigger simulated instant push notification webhook
   */
  async simulatePush(payload = {}) {
    return await request('/webhooks/test-incoming', {
      method: 'POST',
      body: payload,
    });
  },
};

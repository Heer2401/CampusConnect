/**
 * CampusConnect Admin API Client
 * Connects directly to Express backend (/api/admin & /api/auth)
 * Handles JWT authorization, auto-login handshake, and full CRUD operations.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'cc_admin_token';
const USER_KEY = 'cc_admin_user';

export const adminApi = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('cc_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('cc_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, config);
    } catch (networkError) {
      throw new Error(`Cannot connect to backend server at ${API_BASE}. Ensure backend is running.`);
    }

    // If unauthorized, token might be expired
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.logout();
      // Try to re-authenticate once
      const relogged = await this.ensureAdminAuth();
      if (relogged) {
        headers.Authorization = `Bearer ${this.getToken()}`;
        response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      }
    }

    const resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resData.message || resData.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return resData;
  },

  // 1. Authenticate / Login
  async login(email = 'admin@university.edu', password = 'Password123!') {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.token) {
      this.setToken(res.token);
      this.setUser({
        _id: res._id,
        email: res.email,
        role: res.role,
        name: res.name || res.profile?.name || 'Administrator'
      });
    }
    return res;
  },

  // 2. Ensure Admin Auth (Auto handshake if token missing)
  async ensureAdminAuth() {
    const token = this.getToken();
    if (token) return token;

    try {
      const loginRes = await this.login();
      return loginRes.token;
    } catch (err) {
      console.warn('Auto admin login failed:', err.message);
      return null;
    }
  },

  // 3. Analytics & Overview (FR-6.5)
  async getAnalyticsOverview() {
    const res = await this.request('/admin/analytics/overview');
    return res.data || res;
  },

  // 4. Listing Moderation (FR-6.1)
  async getListings(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.queueType) query.append('queueType', params.queueType);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/admin/listings/pending${queryString}`);
    return res.data || [];
  },

  async approveListing(listingId) {
    const res = await this.request(`/admin/listings/${listingId}/approve`, {
      method: 'PATCH'
    });
    return res.data || res;
  },

  async rejectListing(listingId, reason) {
    const res = await this.request(`/admin/listings/${listingId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
    return res.data || res;
  },

  // 5. User Management (FR-6.2)
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role && params.role !== 'all') query.append('role', params.role);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/admin/users${queryString}`);
    return res.data || [];
  },

  async updateUserStatus(userId, status, suspensionReason = '', isVerified = undefined) {
    const body = {};
    if (status) body.status = status;
    if (suspensionReason) body.suspensionReason = suspensionReason;
    if (isVerified !== undefined) body.isVerified = isVerified;
    const res = await this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    return res.data || res;
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.targetModel) query.append('targetModel', params.targetModel);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/admin/audit-logs${queryString}`);
    return res.data || [];
  },

  // 6. Dispute Resolution (FR-6.4)
  async getDisputes(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/admin/disputes${queryString}`);
    return res.data || [];
  },

  async resolveDispute(disputeId, status, actionTaken = 'NoAction', notes = '') {
    const res = await this.request(`/admin/disputes/${disputeId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status, actionTaken, notes })
    });
    return res.data || res;
  },

  // 7. Categories (FR-6.3)
  async getCategories() {
    const res = await this.request('/admin/categories');
    return res.data || [];
  },

  async createCategory(categoryData) {
    const res = await this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
    return res.data || res;
  },

  async updateCategory(categoryId, categoryData) {
    const res = await this.request(`/admin/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
    return res.data || res;
  },

  async deleteCategory(categoryId) {
    const res = await this.request(`/admin/categories/${categoryId}`, {
      method: 'DELETE'
    });
    return res.data || res;
  },

  // 8. Database Seeding Utility
  async seedTestData() {
    const res = await this.request('/admin/seed', {
      method: 'POST'
    });
    return res;
  }
};

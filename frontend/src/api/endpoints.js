import apiClient from './client';

/**
 * Endpoints (The URLs):
 * An endpoint is a specific web address where the frontend sends its request. 
 * Think of it like a specific counter at a fast-food joint.
 * 
 * API Endpoints following CRUD operations:
 * GET (Read): Fetching data (Profile, Requests, Locations)
 * POST (Create): Registering, Logging in, Submitting requests/locations
 * PATCH (Update): Updating outpass status (Approvals/Rejections)
 */

export const authAPI = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

  registerStudent: (studentData) =>
    apiClient.post('/auth/register-student', studentData),

  registerWarden: (wardenData) =>
    apiClient.post('/auth/register-warden', wardenData),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),

  requestPasswordReset: (email) =>
    apiClient.post('/auth/request-password-reset', { email }),

  resetPassword: (token, new_password) =>
    apiClient.post('/auth/reset-password', { token, new_password }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const outpassAPI = {
  validatePass: (id) =>
    apiClient.get(`/outpasses/validate/${id}`),

  submitRequest: (requestData) =>
    apiClient.post('/outpasses/request', requestData),

  getStudentRequests: () =>
    apiClient.get('/outpasses/my-requests'),

  getRequest: (requestId) =>
    apiClient.get(`/outpasses/${requestId}`),

  getPendingRequests: () =>
    apiClient.get('/outpasses/pending'),

  approveRequest: (requestId, wardenNotes = '') =>
    apiClient.patch(`/outpasses/${requestId}/status`, { status: 'approved', warden_notes: wardenNotes || undefined }),

  rejectRequest: (requestId, rejection_reason, wardenNotes = '') =>
    apiClient.patch(`/outpasses/${requestId}/status`, { status: 'rejected', rejection_reason, warden_notes: wardenNotes || undefined }),

  getActiveOutpasses: () =>
    apiClient.get('/outpasses/active'),

  updateRequestStatus: (requestId, status) =>
    apiClient.patch(`/outpasses/${requestId}/status`, { status }),

  getActiveStudents: () =>
    apiClient.get('/location/active-students'),

  expireOverdue: () =>
    apiClient.post('/outpasses/expire-overdue'),

  bulkAction: (ids, action, rejectionReason, wardenNotes = '') =>
    apiClient.post('/outpasses/bulk-action', {
      ids,
      action,
      rejection_reason: rejectionReason,
      warden_notes: wardenNotes || undefined,
    }),
};

export const locationAPI = {
  submitLocation: (requestId, locationData) =>
    apiClient.post(`/location/${requestId}`, locationData),

  getLocations: (requestId) =>
    apiClient.get(`/location/${requestId}/logs`),

  getStudentTrack: (studentId) =>
    apiClient.get(`/location/student/${studentId}`),
};

export const adminAPI = {
  getWardens: () => apiClient.get('/admin/wardens'),
  disableWarden: (wardenId) => apiClient.delete(`/admin/wardens/${wardenId}`),
};

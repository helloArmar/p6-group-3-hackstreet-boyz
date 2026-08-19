import client from './client.js';

const unwrap = (res) => res.data.data;

export const authApi = {
  login: (credentials) => client.post('/auth/login', credentials).then(unwrap),
  me: () => client.get('/auth/me').then(unwrap),
  updateMe: (payload) => client.patch('/auth/me', payload).then(unwrap),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary').then(unwrap),
  rentDue: () => client.get('/dashboard/rent-due').then(unwrap),
  paymentStats: () => client.get('/dashboard/payment-stats').then(unwrap),
};

export const propertyApi = {
  list: (params) => client.get('/properties', { params }).then(unwrap),
  get: (id) => client.get(`/properties/${id}`).then(unwrap),
  create: (payload) => client.post('/properties', payload).then(unwrap),
  update: (id, payload) => client.patch(`/properties/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/properties/${id}`),
};

export const unitApi = {
  list: (params) => client.get('/units', { params }).then(unwrap),
  byProperty: (propertyId) => client.get(`/units/property/${propertyId}`).then(unwrap),
  available: () => client.get('/units/available').then(unwrap),
  create: (payload) => client.post('/units', payload).then(unwrap),
  update: (id, payload) => client.patch(`/units/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/units/${id}`),
};

export const userApi = {
  list: (params) => client.get('/users', { params }).then(unwrap),
  create: (payload) => client.post('/users', payload).then(unwrap),
  remove: (id) => client.delete(`/users/${id}`),
};

export const tenantApi = {
  list: (params) => client.get('/tenants', { params }).then(unwrap),
  me: () => client.get('/tenants/me').then(unwrap),
  get: (id) => client.get(`/tenants/${id}`).then(unwrap),
  create: (payload) => client.post('/tenants', payload).then(unwrap),
  update: (id, payload) => client.patch(`/tenants/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/tenants/${id}`),
  generateCredentials: (id, password) =>
    client.post(`/tenants/${id}/credentials`, { password }).then(unwrap),
};

export const leaseApi = {
  list: (params) => client.get('/leases', { params }).then(unwrap),
  create: (payload) => client.post('/leases', payload).then(unwrap),
  terminate: (id) => client.patch(`/leases/${id}/terminate`).then(unwrap),
};

export const paymentApi = {
  list: (params) => client.get('/payments', { params }).then(unwrap),
  create: (payload) => client.post('/payments', payload).then(unwrap),
  receive: (id) => client.patch(`/payments/${id}/status`, { status: 'paid' }).then(unwrap),
  reject: (id) => client.patch(`/payments/${id}/status`, { status: 'rejected' }).then(unwrap),
};

export const maintenanceApi = {
  list: (params) => client.get('/maintenance', { params }).then(unwrap),
  create: (payload) => client.post('/maintenance', payload).then(unwrap),
  setStatus: (id, payload) => client.patch(`/maintenance/${id}/status`, payload).then(unwrap),
  update: (id, payload) => client.put(`/maintenance/${id}`, payload).then(unwrap),
};

export const messageApi = {
  threads: () => client.get('/messages/threads').then(unwrap),
  // `conversation` is { tenant } for a landlord<->tenant thread or
  // { landlord } for an admin<->landlord thread.
  list: (conversation) => client.get('/messages', { params: conversation }).then(unwrap),
  send: (payload) => client.post('/messages', payload).then(unwrap),
  remove: (id) => client.delete(`/messages/${id}`),
};

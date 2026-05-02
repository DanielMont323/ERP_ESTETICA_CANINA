import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Products services
export const productsAPI = {
  getAll: (params) => api.get('/productos', { params }),
  getById: (id) => api.get(`/productos/${id}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  delete: (id) => api.delete(`/productos/${id}`),
  updateStock: (id, data) => api.patch(`/productos/${id}/stock`, data),
  getLowStock: () => api.get('/productos/low-stock'),
};

// Sales services
export const salesAPI = {
  getAll: (params) => api.get('/ventas', { params }),
  getById: (id) => api.get(`/ventas/${id}`),
  create: (data) => api.post('/ventas', data),
  update: (id, data) => api.put(`/ventas/${id}`, data),
  delete: (id) => api.delete(`/ventas/${id}`),
  getDaily: (date) => api.get(`/ventas/daily/${date}`),
};

// Customers services
export const customersAPI = {
  getAll: (params) => api.get('/clientes', { params: { ...params, active: true } }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`),
};

// Pets services
export const petsAPI = {
  getAll: (params) => api.get('/mascotas', { params: { ...params, active: true } }),
  getById: (id) => api.get(`/mascotas/${id}`),
  create: (data) => api.post('/mascotas', data),
  update: (id, data) => api.put(`/mascotas/${id}`, data),
  delete: (id) => api.delete(`/mascotas/${id}`),
  addMedicalHistory: (id, data) => api.post(`/mascotas/${id}/medical-history`, data),
  addVaccination: (id, data) => api.post(`/mascotas/${id}/vaccinations`, data),
  getVaccinationsDue: () => api.get('/mascotas/vaccinations/due'),
};

// Services services
export const servicesAPI = {
  getAll: (params) => api.get('/servicios', { params }),
  getById: (id) => api.get(`/servicios/${id}`),
  create: (data) => api.post('/servicios', data),
  update: (id, data) => api.put(`/servicios/${id}`, data),
  delete: (id) => api.delete(`/servicios/${id}`),
};

// Suppliers services
export const suppliersAPI = {
  getAll: (params) => api.get('/proveedores', { params }),
  getById: (id) => api.get(`/proveedores/${id}`),
  create: (data) => api.post('/proveedores', data),
  update: (id, data) => api.put(`/proveedores/${id}`, data),
  delete: (id) => api.delete(`/proveedores/${id}`),
  updateDebt: (id, data) => api.patch(`/proveedores/${id}/debt`, data),
};

// Supplier Products services
export const supplierProductsAPI = {
  getAll: (params) => api.get('/supplier-products', { params }),
  getById: (id) => api.get(`/supplier-products/${id}`),
  create: (data) => api.post('/supplier-products', data),
  update: (id, data) => api.put(`/supplier-products/${id}`, data),
  delete: (id) => api.delete(`/supplier-products/${id}`),
  getByProduct: (productId) => api.get(`/supplier-products/product/${productId}`),
  getBySupplier: (supplierId) => api.get(`/supplier-products/supplier/${supplierId}`),
};

// Purchases services
export const purchasesAPI = {
  getAll: (params) => api.get('/compras', { params }),
  getById: (id) => api.get(`/compras/${id}`),
  create: (data) => api.post('/compras', data),
  update: (id, data) => api.put(`/compras/${id}`, data),
  delete: (id) => api.delete(`/compras/${id}`),
};

// Accounts Payable services
export const accountsPayableAPI = {
  getAll: (params) => api.get('/cuentas-por-pagar', { params }),
  getById: (id) => api.get(`/cuentas-por-pagar/${id}`),
  pay: (id, data) => api.patch(`/cuentas-por-pagar/${id}/pagar`, data),
  updateStatus: (id, data) => api.patch(`/cuentas-por-pagar/${id}/status`, data),
  getOverdue: () => api.get('/cuentas-por-pagar/overdue'),
  getUpcoming: () => api.get('/cuentas-por-pagar/upcoming'),
  getSummary: () => api.get('/cuentas-por-pagar/summary'),
};

// Costs services
export const costsAPI = {
  getAll: (params) => api.get('/costos', { params }),
  getById: (id) => api.get(`/costos/${id}`),
  create: (data) => api.post('/costos', data),
  update: (id, data) => api.put(`/costos/${id}`, data),
  delete: (id) => api.delete(`/costos/${id}`),
  getSummary: (period, params) => api.get(`/costos/summary/${period}`, { params }),
};

// Reminders services
export const remindersAPI = {
  getAll: (params) => api.get('/recordatorios', { params }),
  getById: (id) => api.get(`/recordatorios/${id}`),
  create: (data) => api.post('/recordatorios', data),
  update: (id, data) => api.put(`/recordatorios/${id}`, data),
  delete: (id) => api.delete(`/recordatorios/${id}`),
  complete: (id) => api.patch(`/recordatorios/${id}/complete`),
  getUpcoming: () => api.get('/recordatorios/upcoming'),
  getOverdue: () => api.get('/recordatorios/overdue'),
  getCalendar: (year, month) => api.get(`/recordatorios/calendar/${year}/${month}`),
};

// Reports services
export const reportsAPI = {
  getIncomeStatement: (params) => api.get('/reports/income-statement', { params }),
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getCustomers: (params) => api.get('/reports/customers', { params }),
  getDashboard: () => api.get('/reports/dashboard'),
};

export default api;

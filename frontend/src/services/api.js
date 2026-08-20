import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
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
  search: (query, includeInactive) => api.get('/productos/search', { params: { q: query, includeInactive } }),
  restore: (id) => api.patch(`/productos/${id}/restore`),
  getArchived: () => api.get('/productos/archived'),
};

// Product Categories services
export const productCategoriesAPI = {
  getAll: (params) => api.get('/categorias-producto', { params }),
  getById: (id) => api.get(`/categorias-producto/${id}`),
  create: (data) => api.post('/categorias-producto', data),
  update: (id, data) => api.put(`/categorias-producto/${id}`, data),
  delete: (id) => api.delete(`/categorias-producto/${id}`),
};

// Service Categories services
export const serviceCategoriesAPI = {
  getAll: (params) => api.get('/categorias-servicio', { params }),
  getById: (id) => api.get(`/categorias-servicio/${id}`),
  create: (data) => api.post('/categorias-servicio', data),
  update: (id, data) => api.put(`/categorias-servicio/${id}`, data),
  delete: (id) => api.delete(`/categorias-servicio/${id}`),
};

// Vaccination Card services
export const vaccinationCardAPI = {
  getAll: (params) => api.get('/carnet-vacunacion', { params }),
  getById: (id) => api.get(`/carnet-vacunacion/${id}`),
  getByPet: (petId) => api.get(`/carnet-vacunacion/mascota/${petId}`),
  create: (data) => api.post('/carnet-vacunacion', data),
  update: (id, data) => api.put(`/carnet-vacunacion/${id}`, data),
  addVaccine: (id, data) => api.post(`/carnet-vacunacion/${id}/vacunas`, data),
  removeVaccine: (id, vaccineId) => api.delete(`/carnet-vacunacion/${id}/vacunas/${vaccineId}`),
};

// Sales services
export const salesAPI = {
  getAll: (params) => api.get('/ventas', { params }),
  getById: (id) => api.get(`/ventas/${id}`),
  create: (data) => api.post('/ventas', data),
  update: (id, data) => api.put(`/ventas/${id}`, data),
  delete: (id) => api.delete(`/ventas/${id}`),
  cancel: (id) => api.delete(`/ventas/${id}`),
  getDaily: (date) => api.get(`/ventas/daily/${date}`),
  getByPet: (petId) => api.get(`/ventas/by-mascota/${petId}`),
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
  getByOwner: (ownerId) => api.get('/mascotas', { params: { owner: ownerId, active: true } }),
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
  payMassive: (data) => api.post('/cuentas-por-pagar/pagar-masivo', data),
  updateStatus: (id, data) => api.patch(`/cuentas-por-pagar/${id}/status`, data),
  getOverdue: () => api.get('/cuentas-por-pagar/overdue'),
  getUpcoming: () => api.get('/cuentas-por-pagar/upcoming'),
  getDueTomorrow: () => api.get('/cuentas-por-pagar/due-tomorrow'),
  getSummary: () => api.get('/cuentas-por-pagar/summary'),
};

// Vaccines services
export const vaccinesAPI = {
  getAll: (params) => api.get('/vacunas', { params }),
  getActive: () => api.get('/vacunas/active'),
  getById: (id) => api.get(`/vacunas/${id}`),
  create: (data) => api.post('/vacunas', data),
  update: (id, data) => api.put(`/vacunas/${id}`, data),
  updateStatus: (id, data) => api.patch(`/vacunas/${id}/status`, data),
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
  getAutomaticAccounts: () => api.get('/recordatorios/automatic/accounts'),
  getAutomaticVaccines: () => api.get('/recordatorios/automatic/vaccines'),
  getAutomaticAll: () => api.get('/recordatorios/automatic/all'),
  getUpcoming: () => api.get('/recordatorios/upcoming'),
  getOverdue: () => api.get('/recordatorios/overdue'),
  getCalendar: (year, month) => api.get(`/recordatorios/calendar/${year}/${month}`),
  getDashboard: () => api.get('/recordatorios/dashboard'),
};

// Reports services
export const reportsAPI = {
  getIncomeStatement: (params) => api.get('/reports/income-statement', { params }),
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getSalesBehavior: (params) => api.get('/reports/sales-behavior', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getCustomers: (params) => api.get('/reports/customers', { params }),
  getDashboard: () => api.get('/reports/dashboard'),
  exportSales: (params) => api.get('/reports/export-sales', { 
    params,
    responseType: 'blob'
  }),
};

export default api;

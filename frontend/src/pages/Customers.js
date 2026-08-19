import React, { useState, useEffect } from 'react';
import { customersAPI, salesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShoppingCart
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [customerSales, setCustomerSales] = useState({});
  const [loadingSales, setLoadingSales] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      console.log('Clientes cargados:', response.data.data);
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer._id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await customersAPI.create(formData);
        toast.success('Cliente creado correctamente');
      }

      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar cliente');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteCustomerId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await customersAPI.delete(deleteCustomerId);
      toast.success('Cliente desactivado correctamente');
      fetchCustomers();
    } catch (error) {
      toast.error('Error al desactivar cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
  };

  const fetchCustomerSales = async (customerId) => {
    if (customerSales[customerId] || loadingSales[customerId]) return;
    
    setLoadingSales(prev => ({ ...prev, [customerId]: true }));
    try {
      const response = await salesAPI.getAll({ customer: customerId });
      setCustomerSales(prev => ({ ...prev, [customerId]: response.data.data }));
    } catch (error) {
      console.error('Error al cargar ventas de cliente:', error);
      setCustomerSales(prev => ({ ...prev, [customerId]: [] }));
    } finally {
      setLoadingSales(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const toggleExpand = (customerId) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
      fetchCustomerSales(customerId);
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.isActive && (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="title" className="w-48" />
            <Skeleton variant="text" className="w-64 mt-2" />
          </div>
          <Skeleton variant="button" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona la información de tus clientes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {customer.email}
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {customer.address}
                      </div>
                    )}
                  </div>
                  {customer.notes && (
                    <p className="mt-2 text-sm text-gray-500">{customer.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleExpand(customer._id)}
                    className="text-brand-burgundy hover:text-primary-900"
                    title="Ver historial de ventas"
                  >
                    {expandedCustomerId === customer._id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="text-brand-burgundy hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer._id)}
                    className="text-danger-600 hover:text-danger-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sales History */}
              {expandedCustomerId === customer._id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Historial de Ventas
                  </h4>
                  {loadingSales[customer._id] ? (
                    <div className="text-sm text-gray-500">Cargando ventas...</div>
                  ) : customerSales[customer._id]?.length > 0 ? (
                    <div className="space-y-2">
                      {customerSales[customer._id].map((sale) => (
                        <div key={sale._id} className="text-sm bg-gray-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {new Date(sale.date).toLocaleDateString('es-MX')}
                            </span>
                            <span className="text-gray-600">
                              ${sale.total?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {sale.items?.map((item, idx) => (
                              <span key={idx}>
                                {item.quantity}x {item.item?.name || 'Producto'}
                                {idx < sale.items.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No hay ventas registradas</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron clientes</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Teléfono *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="form-input"
                      placeholder="10 dígitos"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="form-input"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Dirección</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="form-input"
                      rows={2}
                      placeholder="Calle, número, colonia..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Notas</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="form-input"
                      rows={3}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                  >
                    {editingCustomer ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteCustomerId(null);
        }}
        onConfirm={confirmDelete}
        title="Desactivar cliente"
        message="¿Estás seguro de que deseas desactivar este cliente? Esta acción se puede deshacer más tarde."
        confirmText="Desactivar"
        type="danger"
      />
    </div>
  );
};

export default Customers;

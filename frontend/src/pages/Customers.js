import React, { useState, useEffect } from 'react';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
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
    if (window.confirm('¿Estás seguro de que deseas desactivar este cliente?')) {
      try {
        await customersAPI.delete(id);
        toast.success('Cliente desactivado correctamente');
        fetchCustomers();
      } catch (error) {
        toast.error('Error al desactivar cliente');
      }
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

  const filteredCustomers = customers.filter(customer => 
    customer.isActive && (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                    onClick={() => handleEdit(customer)}
                    className="text-primary-600 hover:text-primary-900"
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
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
    </div>
  );
};

export default Customers;

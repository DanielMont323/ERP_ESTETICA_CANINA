import React, { useState, useEffect } from 'react';
import { suppliersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import {
  Plus,
  Phone,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    creditDays: 0,
    earlyPaymentDiscount: 0,
    currentDebt: 0
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data.data);
    } catch (error) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      creditDays: 0,
      earlyPaymentDiscount: 0,
      currentDebt: 0
    });
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      creditDays: supplier.creditDays,
      earlyPaymentDiscount: supplier.earlyPaymentDiscount || 0,
      currentDebt: supplier.currentDebt
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    setDeleteSupplierId(supplierId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await suppliersAPI.delete(deleteSupplierId);
      toast.success('Proveedor eliminado correctamente');
      fetchSuppliers();
    } catch (error) {
      toast.error('Error al eliminar proveedor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Limpiar el teléfono: eliminar espacios, guiones y paréntesis
      const cleanedData = {
        ...formData,
        phone: formData.phone.replace(/\D/g, '') // Solo mantener dígitos
      };
      
      console.log('Enviando datos de proveedor:', cleanedData);
      
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier._id, cleanedData);
        toast.success('Proveedor actualizado correctamente');
      } else {
        await suppliersAPI.create(cleanedData);
        toast.success('Proveedor creado correctamente');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      console.error('Detalles del error:', error.response?.data);
      toast.error(`Error: ${error.response?.data?.message || 'Error al guardar proveedor'}`);
    }
  };

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
          <h1 className="text-2xl font-semibold text-gray-900">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona la información de tus proveedores
          </p>
        </div>
        <button onClick={handleCreateSupplier} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Contacto:</span> {supplier.contact}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {supplier.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Crédito: {supplier.creditDays} días
                    </div>
                    {supplier.earlyPaymentDiscount > 0 && (
                      <div className="flex items-center text-sm text-green-600">
                        Descuento pronto pago: {supplier.earlyPaymentDiscount}%
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      Deuda actual: {formatCurrency(supplier.currentDebt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEditSupplier(supplier)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSupplier(supplier._id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Contacto</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="form-input"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="form-label">Días de crédito</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.creditDays}
                    onChange={(e) => setFormData({...formData, creditDays: parseInt(e.target.value)})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Descuento por pronto pago (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.earlyPaymentDiscount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value < 0) {
                        toast.error('No puede ser menor a 0%');
                        return;
                      }
                      if (value > 100) {
                        toast.error('No puede ser mayor a 100%');
                        return;
                      }
                      setFormData({...formData, earlyPaymentDiscount: value || 0});
                    }}
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Porcentaje de descuento que aplica el proveedor si la cuenta se paga dentro del periodo de crédito.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
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
                    {editingSupplier ? 'Actualizar' : 'Crear'}
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
          setDeleteSupplierId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar proveedor"
        message="¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default Suppliers;

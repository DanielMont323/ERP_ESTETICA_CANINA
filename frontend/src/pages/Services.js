import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { servicesAPI, serviceCategoriesAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Clock,
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';

const Services = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'user';
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: '',
    discountPercentage: '0',
    insumos: []
  });
  const nameInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchProducts();
  }, []);

  // Listener para evento personalizado de F9 contextual (nuevo servicio)
  useEffect(() => {
    const handleOpenNewService = () => {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration: '',
        category: '',
        discountPercentage: '0',
        insumos: []
      });
      setShowModal(true);
      // Colocar foco en el campo nombre después de que el modal se abra
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('openNewService', handleOpenNewService);
    return () => window.removeEventListener('openNewService', handleOpenNewService);
  }, []);

  // Navegación por teclado en formulario
  useKeyboardFormNavigation(formRef, showModal);

  // Manejo de ESC para cerrar modal
  useEscapeKey(() => setShowModal(false), showModal);

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      setServices(response.data.data);
    } catch (error) {
      toast.error('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await serviceCategoriesAPI.getAll({ active: true });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ active: true });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleCreateService = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      category: '',
      discountPercentage: '0',
      insumos: []
    });
    setShowModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
      category: service.category?._id || service.category,
      discountPercentage: (service.discountPercentage || 0).toString(),
      insumos: service.insumos || []
    });
    setShowModal(true);
  };

  const handleDeleteService = async (serviceId) => {
    setDeleteServiceId(serviceId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await servicesAPI.delete(deleteServiceId);
      toast.success('Servicio eliminado correctamente');
      fetchServices();
    } catch (error) {
      toast.error('Error al eliminar servicio');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await servicesAPI.update(editingService._id, formData);
        toast.success('Servicio actualizado correctamente');
      } else {
        await servicesAPI.create(formData);
        toast.success('Servicio creado correctamente');
      }
      setShowModal(false);
      fetchServices();
    } catch (error) {
      toast.error('Error al guardar servicio');
    }
  };

  const addInsumo = () => {
    setFormData({
      ...formData,
      insumos: [...formData.insumos, { producto: '', cantidad: 1 }]
    });
  };

  const removeInsumo = (index) => {
    setFormData({
      ...formData,
      insumos: formData.insumos.filter((_, i) => i !== index)
    });
  };

  const updateInsumo = (index, field, value) => {
    const updatedInsumos = [...formData.insumos];
    updatedInsumos[index][field] = field === 'cantidad' ? parseFloat(value) : value;
    setFormData({ ...formData, insumos: updatedInsumos });
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
          <h1 className="text-2xl font-semibold text-gray-900">Servicios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los servicios que ofreces
          </p>
        </div>
        <button onClick={handleCreateService} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                  {service.description && (
                    <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                  )}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {service.duration} minutos
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {service.discountPercentage > 0 ? (
                        <div>
                          <span className="text-gray-400 line-through text-sm">{formatCurrency(service.price)}</span>
                          <span className="text-success-600 font-semibold ml-2">
                            {formatCurrency(service.price * (1 - service.discountPercentage / 100))}
                          </span>
                        </div>
                      ) : (
                        formatCurrency(service.price)
                      )}
                    </div>
                    {service.discountPercentage > 0 && (
                      <div className="text-sm text-success-600 font-medium">
                        {service.discountPercentage}% de descuento
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="badge badge-info">
                        {service.category?.name || 'Sin categoría'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEditService(service)}
                    className="text-brand-burgundy hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteService(service._id)}
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
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="form-label">Nombre</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="form-label">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Duración (minutos)</label>
                  <input
                    type="number"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Categoría</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({...formData, discountPercentage: e.target.value})}
                    className="form-input"
                    placeholder="0 para sin descuento"
                  />
                </div>

                {/* Insumos - Solo ADMIN */}
                {userRole === 'admin' && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <label className="form-label mb-0">Insumos requeridos</label>
                      <button
                        type="button"
                        onClick={addInsumo}
                        className="btn btn-primary btn-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar insumo
                      </button>
                    </div>
                    
                    {formData.insumos.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No hay insumos configurados
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.insumos.map((insumo, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                              <select
                                value={insumo.producto}
                                onChange={(e) => updateInsumo(index, 'producto', e.target.value)}
                                className="form-input"
                              >
                                <option value="">Seleccionar producto...</option>
                                {products.map(product => (
                                  <option key={product._id} value={product._id}>
                                    {product.name} ({product.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={insumo.cantidad}
                                onChange={(e) => updateInsumo(index, 'cantidad', e.target.value)}
                                className="form-input"
                                placeholder="Cant."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeInsumo(index)}
                              className="text-danger-600 hover:text-danger-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                    {editingService ? 'Actualizar' : 'Crear'}
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
          setDeleteServiceId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar servicio"
        message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default Services;

import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Clock,
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: 'baño'
  });

  useEffect(() => {
    fetchServices();
  }, []);

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
      category: 'baño'
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
      category: service.category
    });
    setShowModal(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      try {
        await servicesAPI.delete(serviceId);
        toast.success('Servicio eliminado correctamente');
        fetchServices();
      } catch (error) {
        toast.error('Error al eliminar servicio');
      }
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
                      {formatCurrency(service.price)}
                    </div>
                    <div className="text-sm">
                      <span className="capitalize badge badge-info">
                        {service.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEditService(service)}
                    className="text-primary-600 hover:text-primary-900"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
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
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="form-input"
                  >
                    <option value="baño">Baño</option>
                    <option value="corte">Corte</option>
                    <option value="consulta">Consulta</option>
                    <option value="vacunación">Vacunación</option>
                    <option value="desparasitación">Desparasitación</option>
                    <option value="estética">Estética</option>
                    <option value="otros">Otros</option>
                  </select>
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
                    {editingService ? 'Actualizar' : 'Crear'}
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

export default Services;

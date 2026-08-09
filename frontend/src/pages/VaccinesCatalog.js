import React, { useState, useEffect } from 'react';
import { vaccinesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Search
} from 'lucide-react';

const VaccinesCatalog = () => {
  const { user } = useAuth();
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Solo administradores pueden acceder al catálogo de vacunas');
      return;
    }
    fetchVaccines();
  }, [user]);

  const fetchVaccines = async () => {
    try {
      const response = await vaccinesAPI.getAll();
      setVaccines(response.data.data);
    } catch (error) {
      toast.error('Error al cargar vacunas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVaccine) {
        await vaccinesAPI.update(editingVaccine._id, formData);
        toast.success('Vacuna actualizada correctamente');
      } else {
        await vaccinesAPI.create(formData);
        toast.success('Vacuna creada correctamente');
      }
      setShowModal(false);
      setEditingVaccine(null);
      setFormData({ name: '', description: '', isActive: true });
      fetchVaccines();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar vacuna');
    }
  };

  const handleEdit = (vaccine) => {
    setEditingVaccine(vaccine);
    setFormData({
      name: vaccine.name,
      description: vaccine.description || '',
      isActive: vaccine.isActive
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (vaccine) => {
    try {
      await vaccinesAPI.updateStatus(vaccine._id, { isActive: !vaccine.isActive });
      toast.success(vaccine.isActive ? 'Vacuna desactivada' : 'Vacuna activada');
      fetchVaccines();
    } catch (error) {
      toast.error('Error al cambiar estado de vacuna');
    }
  };

  const handleDelete = async (vaccineId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta vacuna?')) return;
    
    try {
      // Usar updateStatus para desactivar en lugar de eliminar (soft delete)
      await vaccinesAPI.updateStatus(vaccineId, { isActive: false });
      toast.success('Vacuna desactivada');
      fetchVaccines();
    } catch (error) {
      toast.error('Error al desactivar vacuna');
    }
  };

  const filteredVaccines = vaccines.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">No tienes permiso para acceder a esta página</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SkeletonTable rows={5} columns={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Catálogo de Vacunas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona el catálogo de vacunas del sistema
          </p>
        </div>
        <button
          onClick={() => {
            setEditingVaccine(null);
            setFormData({ name: '', description: '', isActive: true });
            setShowModal(true);
          }}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Vacuna
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vacunas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Vaccines Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVaccines.map((vaccine) => (
                <tr key={vaccine._id}>
                  <td className="font-medium">{vaccine.name}</td>
                  <td className="text-gray-600">{vaccine.description || '-'}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        vaccine.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vaccine.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(vaccine)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(vaccine)}
                        className={
                          vaccine.isActive
                            ? 'text-orange-600 hover:text-orange-800 transition-colors'
                            : 'text-green-600 hover:text-green-800 transition-colors'
                        }
                        title={vaccine.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {vaccine.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(vaccine._id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            <div className="relative modal-content max-w-md w-full animate-slide-up">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingVaccine ? 'Editar Vacuna' : 'Nueva Vacuna'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="form-input"
                        placeholder="Nombre de la vacuna"
                      />
                    </div>
                    <div>
                      <label className="form-label">Descripción</label>
                      <textarea
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-input"
                        placeholder="Descripción opcional"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Vacuna activa
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary btn-md"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary btn-md">
                      {editingVaccine ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaccinesCatalog;

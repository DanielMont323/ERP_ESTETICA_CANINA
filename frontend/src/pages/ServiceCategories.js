import React, { useState, useEffect } from 'react';
import { serviceCategoriesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import {
  Plus,
  Edit,
  Trash2,
  Scissors
} from 'lucide-react';

const ServiceCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await serviceCategoriesAPI.getAll();
      setCategories(response.data.data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await serviceCategoriesAPI.update(editingCategory._id, formData);
        toast.success('Categoría actualizada correctamente');
      } else {
        await serviceCategoriesAPI.create(formData);
        toast.success('Categoría creada correctamente');
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', isActive: true });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar categoría');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive
    });
    setShowModal(true);
  };

  const handleDelete = (categoryId) => {
    setDeleteCategoryId(categoryId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await serviceCategoriesAPI.delete(deleteCategoryId);
      toast.success('Categoría eliminada correctamente');
      setShowDeleteModal(false);
      setDeleteCategoryId(null);
      fetchCategories();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await serviceCategoriesAPI.update(category._id, {
        isActive: !category.isActive
      });
      toast.success('Estado actualizado correctamente');
      fetchCategories();
    } catch (error) {
      toast.error('Error al actualizar estado');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Categorías de Servicios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las categorías para organizar tus servicios
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', description: '', isActive: true });
            setShowModal(true);
          }}
          className="btn btn-primary btn-md hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category._id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-primary-100 text-primary-600 mr-3">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category._id)}
                    className="text-gray-400 hover:text-danger-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className={`text-xs px-2 py-1 rounded ${
                  category.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {category.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <button
                  onClick={() => handleToggleActive(category)}
                  className="text-sm text-primary-600 hover:text-primary-900 transition-colors"
                >
                  {category.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="form-input"
                      placeholder="Ej: Baño"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Descripción</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="form-input"
                      rows="3"
                      placeholder="Descripción opcional"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      Categoría activa
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCategory(null);
                      setFormData({ name: '', description: '', isActive: true });
                    }}
                    className="btn btn-secondary btn-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md hover:scale-105 transition-transform"
                  >
                    {editingCategory ? 'Actualizar' : 'Crear'}
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
          setDeleteCategoryId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar categoría"
        message="¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default ServiceCategories;

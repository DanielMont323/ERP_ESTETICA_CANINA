import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { petsAPI, customersAPI, salesAPI, vaccinationCardAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Autocomplete from '../components/Autocomplete';
import { formatCalendarDate, getCalendarDay, getMonthName } from '../helpers/dateUtils';
import {
  Plus,
  Calendar,
  Scale,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  FileText,
  Search
} from 'lucide-react';

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePetId, setDeletePetId] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [expandedPetId, setExpandedPetId] = useState(null);
  const [petSales, setPetSales] = useState({});
  const [loadingSales, setLoadingSales] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    birthDate: '',
    weight: '',
    gender: '',
    ownerId: ''
  });
  const nameInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [pagination.page, pagination.limit]);

  // Recargar datos cuando cambia el término de búsqueda
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData();
  }, [searchTerm]);

  // Listener para evento personalizado de F7 contextual (nueva mascota)
  useEffect(() => {
    const handleOpenNewPet = () => {
      setEditingPet(null);
      setFormData({
        name: '',
        type: '',
        breed: '',
        birthDate: '',
        weight: '',
        gender: '',
        ownerId: ''
      });
      setShowModal(true);
      // Colocar foco en el campo nombre después de que el modal se abra
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('openNewPet', handleOpenNewPet);
    return () => window.removeEventListener('openNewPet', handleOpenNewPet);
  }, []);

  // Navegación por teclado en formulario
  useKeyboardFormNavigation(formRef, showModal);

  // Manejo de ESC para cerrar modal
  useEscapeKey(() => setShowModal(false), showModal);

  const fetchData = async () => {
    try {
      const params = {
        page: searchTerm ? 1 : pagination.page,
        limit: searchTerm ? 1000 : pagination.limit
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const petsRes = await petsAPI.getAll(params);
      console.log('Mascotas cargadas:', petsRes.data.data);
      setPets(petsRes.data.data);
      setPagination(petsRes.data.pagination || pagination);
    } catch (error) {
      console.error('Error al cargar mascotas:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const customersRes = await customersAPI.getAll();
      setCustomers(customersRes.data.data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  // Fetch customers for autocomplete
  const fetchCustomersForAutocomplete = async (searchQuery) => {
    try {
      const response = await customersAPI.getAll({ search: searchQuery, limit: 1000 });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      return [];
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
      age--;
    }
    
    return age;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const fetchPetSales = async (petId) => {
    if (petSales[petId] || loadingSales[petId]) return;
    
    setLoadingSales(prev => ({ ...prev, [petId]: true }));
    try {
      const response = await salesAPI.getByPet(petId);
      setPetSales(prev => ({ ...prev, [petId]: response.data.data }));
    } catch (error) {
      console.error('Error al cargar ventas de mascota:', error);
      setPetSales(prev => ({ ...prev, [petId]: [] }));
    } finally {
      setLoadingSales(prev => ({ ...prev, [petId]: false }));
    }
  };

  const toggleExpand = (petId) => {
    if (expandedPetId === petId) {
      setExpandedPetId(null);
    } else {
      setExpandedPetId(petId);
      fetchPetSales(petId);
    }
  };

  const handleCreatePet = () => {
    setEditingPet(null);
    setFormData({
      name: '',
      type: '',
      breed: '',
      birthDate: '',
      weight: '',
      gender: '',
      ownerId: ''
    });
    setShowModal(true);
  };

  const handleEditPet = (pet) => {
    console.log('Editando mascota:', pet);
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      birthDate: formatCalendarDate(pet.birthDate).split('/').reverse().join('-'),
      weight: pet.weight,
      gender: pet.gender,
      ownerId: pet.owner?._id || ''
    });
    setShowModal(true);
  };

  const handleDeletePet = async (petId) => {
    setDeletePetId(petId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      console.log('Eliminando mascota:', deletePetId);
      await petsAPI.delete(deletePetId);
      toast.success('Mascota eliminada correctamente');
      await fetchData();
    } catch (error) {
      console.error('Error al eliminar mascota:', error);
      toast.error('Error al eliminar mascota');
    } finally {
      setShowDeleteModal(false);
      setDeletePetId(null);
    }
  };

  const handleCreateVaccinationCard = async (pet) => {
    try {
      // Verificar si ya existe carnet
      const existingCard = await vaccinationCardAPI.getByPet(pet._id);
      if (existingCard.data.data) {
        toast.error('La mascota ya tiene un carnet de vacunación');
        return;
      }

      // Verificar que la mascota tenga propietario
      if (!pet.owner) {
        toast.error('La mascota debe tener un propietario para crear el carnet');
        return;
      }

      // Crear carnet
      await vaccinationCardAPI.create({
        mascota: pet._id,
        nombreMascota: pet.name,
        especie: pet.type,
        raza: pet.breed,
        propietario: pet.owner._id || pet.owner,
        nombrePropietario: pet.owner.name || 'Desconocido',
        vacunas: []
      });

      toast.success('Carnet de vacunación creado correctamente');
      // Recargar datos para actualizar la interfaz
      await fetchData();
    } catch (error) {
      console.error('Error al crear carnet:', error);
      toast.error(error.response?.data?.message || 'Error al crear carnet de vacunación');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convertir ownerId a owner para el backend
      const dataToSend = {
        ...formData,
        owner: formData.ownerId || undefined
      };
      delete dataToSend.ownerId; // Eliminar el campo ownerId
      
      console.log('Enviando datos de mascota:', dataToSend);
      
      if (editingPet) {
        await petsAPI.update(editingPet._id, dataToSend);
        toast.success('Mascota actualizada correctamente');
      } else {
        await petsAPI.create(dataToSend);
        toast.success('Mascota creada correctamente');
      }
      setShowModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error al guardar mascota:', error);
      toast.error('Error al guardar mascota');
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text">Mascotas</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-textSecondary">
            Gestiona la información de las mascotas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-textSecondary" />
              <input
                type="text"
                placeholder="Buscar mascotas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <button onClick={handleCreatePet} className="btn btn-primary btn-md">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Mascota
          </button>
        </div>
      </div>

      {/* Pets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets.map((pet) => (
          <div key={pet._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">{pet.name}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-textSecondary">
                      <span className="capitalize">{pet.type}</span> • {pet.breed}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-textSecondary">
                      <Calendar className="h-4 w-4 mr-2" />
                      {calculateAge(pet.birthDate)} años
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-textSecondary">
                      <Scale className="h-4 w-4 mr-2" />
                      {pet.weight} kg
                    </div>
                    <div className="text-sm text-gray-600 dark:text-dark-textSecondary">
                      Dueño: {pet.owner?.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => toggleExpand(pet._id)}
                    className="text-brand-burgundy hover:text-primary-900"
                    title="Ver historial"
                  >
                    {expandedPetId === pet._id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleCreateVaccinationCard(pet)}
                    className="text-success-600 hover:text-success-900"
                    title="Crear carnet de vacunación"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleEditPet(pet)}
                    className="text-brand-burgundy hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePet(pet._id)}
                    className="text-danger-600 hover:text-danger-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sales History */}
              {expandedPetId === pet._id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3 flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Historial de compras y servicios
                  </h4>
                  {loadingSales[pet._id] ? (
                    <div className="text-center py-4 text-gray-500 dark:text-dark-textSecondary">
                      Cargando historial...
                    </div>
                  ) : petSales[pet._id] && petSales[pet._id].length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {petSales[pet._id].map((sale) => (
                        <div key={sale._id} className="bg-gray-50 dark:bg-dark-surface rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                {formatCalendarDate(sale.date)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                                Venta #{sale._id.slice(-6)}
                              </p>
                            </div>
                            <p className="font-medium text-brand-burgundy">
                              {formatCurrency(sale.total)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            {sale.items.filter(item => item.type === 'producto').length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-dark-textSecondary">Productos:</p>
                                {sale.items.filter(item => item.type === 'producto').map((item, idx) => (
                                  <p key={idx} className="text-xs text-gray-600 dark:text-dark-textSecondary">
                                    • {item.quantity}x {item.item?.name || 'Producto'}
                                  </p>
                                ))}
                              </div>
                            )}
                            {sale.items.filter(item => item.type === 'servicio').length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-dark-textSecondary">Servicios:</p>
                                {sale.items.filter(item => item.type === 'servicio').map((item, idx) => (
                                  <p key={idx} className="text-xs text-gray-600 dark:text-dark-textSecondary">
                                    • {item.quantity}x {item.item?.name || 'Servicio'}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border">
                            <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                              Método: <span className="capitalize">{sale.paymentMethod}</span>
                            </p>
                            {sale.customer && (
                              <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                                Cliente: {sale.customer.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-dark-textSecondary">
                      <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm">No hay historial de compras</p>
                    </div>
                  )}

                  {/* Medical History */}
                  {pet.medicalHistory && pet.medicalHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Historial médico
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {pet.medicalHistory.map((entry, idx) => (
                          <div key={idx} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                {entry.description}
                              </p>
                              {entry.cost && (
                                <p className="font-medium text-brand-burgundy text-sm">
                                  {formatCurrency(entry.cost)}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                              {formatCalendarDate(entry.date)}
                              {entry.veterinarian && ` • ${entry.veterinarian}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Pagination
        pagination={pagination}
        onPageChange={(page) => setPagination({ ...pagination, page })}
        onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          
          <div className="relative modal-content max-w-lg w-full max-h-[90vh] flex flex-col animate-slide-up">
            {/* Header Sticky */}
            <div className="sticky top-0 bg-white dark:bg-dark-card z-10 p-6 border-b border-gray-200 dark:border-dark-border rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {editingPet ? 'Editar Mascota' : 'Nueva Mascota'}
              </h3>
            </div>
            
            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
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
                    <label className="form-label">Tipo</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="perro">Perro</option>
                      <option value="gato">Gato</option>
                      <option value="ave">Ave</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Raza</label>
                    <input
                      type="text"
                      required
                      value={formData.breed}
                      onChange={(e) => setFormData({...formData, breed: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Fecha de nacimiento</label>
                    <input
                      type="date"
                      required
                      value={formData.birthDate}
                      onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Sexo</label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Seleccionar sexo</option>
                      <option value="macho">Macho</option>
                      <option value="hembra">Hembra</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Dueño (opcional)</label>
                    <Autocomplete
                      placeholder="Sin dueño asignado"
                      fetchOptions={fetchCustomersForAutocomplete}
                      displayValue={(item) => `${item.name} - ${item.phone}`}
                      getOptionValue={(item) => item._id}
                      value={customers.find(c => c._id === formData.ownerId) || null}
                      onChange={(value) => setFormData({...formData, ownerId: value})}
                      minLength={1}
                    />
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer Sticky */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-card p-6 border-t border-gray-200 dark:border-dark-border rounded-b-xl">
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
                  onClick={(e) => {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }}
                  className="btn btn-primary btn-md"
                >
                  {editingPet ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePetId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar mascota"
        message="¿Estás seguro de que deseas eliminar esta mascota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default Pets;

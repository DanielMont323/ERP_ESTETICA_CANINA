import React, { useState, useEffect } from 'react';
import { vaccinationCardAPI, vaccinesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  Syringe,
  Calendar,
  Plus,
  Trash2,
  Search,
  Dog,
  User,
  Pill
} from 'lucide-react';

const VaccinationCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [showDeleteVaccineModal, setShowDeleteVaccineModal] = useState(false);
  const [deleteVaccineId, setDeleteVaccineId] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [loadingVaccines, setLoadingVaccines] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({
    vacunaId: '',
    diasProximaDosis: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  // Cargar vacunas cuando se abre el modal
  useEffect(() => {
    if (showVaccineModal) {
      fetchVaccines();
    }
  }, [showVaccineModal]);

  // Manejo de ESC para cerrar modal de agregar vacuna
  useEscapeKey(() => setShowVaccineModal(false), showVaccineModal);

  const fetchVaccines = async () => {
    setLoadingVaccines(true);
    try {
      const response = await vaccinesAPI.getActive();
      setVaccines(response.data.data);
    } catch (error) {
      console.error('Error al cargar vacunas:', error);
      toast.error('Error al cargar catálogo de vacunas');
    } finally {
      setLoadingVaccines(false);
    }
  };

  const fetchCards = async () => {
    try {
      const response = await vaccinationCardAPI.getAll();
      setCards(response.data.data);
    } catch (error) {
      toast.error('Error al cargar carnets de vacunación');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVaccine = async (e) => {
    e.preventDefault();
    try {
      // Enviar vacunaId como vacuna para el backend
      const dataToSend = {
        vacuna: vaccineForm.vacunaId,
        diasProximaDosis: vaccineForm.diasProximaDosis ? parseInt(vaccineForm.diasProximaDosis) : null,
        observaciones: vaccineForm.observaciones
      };
      
      console.log('Enviando datos:', dataToSend);
      
      await vaccinationCardAPI.addVaccine(selectedCard._id, dataToSend);
      toast.success('Vacuna agregada correctamente');
      setShowVaccineModal(false);
      setVaccineForm({ vacunaId: '', diasProximaDosis: '', observaciones: '' });
      fetchCards();
    } catch (error) {
      console.error('Error al agregar vacuna:', error);
      toast.error(error.response?.data?.message || 'Error al agregar vacuna');
    }
  };

  const handleDeleteVaccine = (vaccineId) => {
    setDeleteVaccineId(vaccineId);
    setShowDeleteVaccineModal(true);
  };

  const confirmDeleteVaccine = async () => {
    try {
      await vaccinationCardAPI.removeVaccine(selectedCard._id, deleteVaccineId);
      toast.success('Vacuna eliminada correctamente');
      setShowDeleteVaccineModal(false);
      setDeleteVaccineId(null);
      fetchCards();
    } catch (error) {
      toast.error('Error al eliminar vacuna');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const calculateNextDoseDate = (days) => {
    if (!days || days <= 0) return null;
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + parseInt(days));
    return formatDate(nextDate);
  };

  const getCurrentDateGMT7 = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt7 = new Date(utc - (7 * 3600000));
    return formatDate(gmt7);
  };

  const filteredCards = cards.filter(card =>
    card.nombreMascota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.nombrePropietario?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Carnet de Vacunación</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los carnets de vacunación de las mascotas
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por mascota o propietario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCards.map((card) => (
          <div key={card._id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              {/* Pet Info */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-primary-100 text-brand-burgundy mr-3">
                    <Dog className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{card.nombreMascota}</h3>
                    <p className="text-sm text-gray-600">{card.especie} - {card.raza}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(card)}
                  className="text-brand-burgundy hover:text-primary-900 text-sm font-medium"
                >
                  {selectedCard?._id === card._id ? 'Cerrar' : 'Ver detalles'}
                </button>
              </div>

              {/* Owner Info */}
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <User className="h-4 w-4 mr-2" />
                <span>{card.nombrePropietario}</span>
              </div>

              {/* Vaccines List */}
              {selectedCard?._id === card._id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Vacunas</h4>
                    <button
                      onClick={() => setShowVaccineModal(true)}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </button>
                  </div>
                  
                  {card.vacunas.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay vacunas/desparasitantes registrados
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {card.vacunas.map((vaccine) => (
                        <div key={vaccine._id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                {vaccine.tipo === 'desparasitante' ? (
                                  <Pill className="h-4 w-4 text-purple-600 mr-2" />
                                ) : (
                                  <Syringe className="h-4 w-4 text-brand-burgundy mr-2" />
                                )}
                                <p className="font-medium text-gray-900">{vaccine.nombre}</p>
                                <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                  vaccine.tipo === 'desparasitante' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-primary-100 text-primary-800'
                                }`}>
                                  {vaccine.tipo === 'desparasitante' ? 'Desparasitante' : 'Vacuna'}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>Fecha: {formatDate(vaccine.fecha)}</span>
                                </div>
                                {vaccine.proximaDosis && (
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>Próxima dosis: {formatDate(vaccine.proximaDosis)}</span>
                                  </div>
                                )}
                                {vaccine.observaciones && (
                                  <p className="text-gray-500 italic">{vaccine.observaciones}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteVaccine(vaccine._id)}
                              className="text-danger-600 hover:text-danger-900 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Vaccine Modal */}
      {showVaccineModal && selectedCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowVaccineModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agregar Vacuna - {selectedCard.nombreMascota}
              </h3>
              
              <form onSubmit={handleAddVaccine} className="space-y-4">
                <div>
                  <label className="form-label">Seleccionar vacuna</label>
                  <select
                    required
                    value={vaccineForm.vacunaId}
                    onChange={(e) => setVaccineForm({...vaccineForm, vacunaId: e.target.value})}
                    className="form-input"
                    disabled={loadingVaccines}
                  >
                    <option value="">Seleccione una vacuna...</option>
                    {vaccines.map(vaccine => (
                      <option key={vaccine._id} value={vaccine._id}>
                        {vaccine.name}
                      </option>
                    ))}
                  </select>
                  {loadingVaccines && (
                    <p className="text-sm text-gray-500 mt-1">Cargando catálogo de vacunas...</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Fecha de aplicación</label>
                  <input
                    type="text"
                    value={getCurrentDateGMT7()}
                    disabled
                    className="form-input bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha automática (GMT-7 Tepic)</p>
                </div>
                
                <div>
                  <label className="form-label">Días para próxima dosis (opcional)</label>
                  <input
                    type="number"
                    min="0"
                    value={vaccineForm.diasProximaDosis}
                    onChange={(e) => setVaccineForm({...vaccineForm, diasProximaDosis: e.target.value})}
                    className="form-input"
                    placeholder="Ej: 30"
                  />
                  {vaccineForm.diasProximaDosis && vaccineForm.diasProximaDosis > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Próxima dosis: <span className="font-medium">{calculateNextDoseDate(vaccineForm.diasProximaDosis)}</span>
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Observaciones</label>
                  <textarea
                    value={vaccineForm.observaciones}
                    onChange={(e) => setVaccineForm({...vaccineForm, observaciones: e.target.value})}
                    className="form-input"
                    rows="3"
                    placeholder="Notas adicionales..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVaccineModal(false);
                      setVaccineForm({ vacunaId: '', diasProximaDosis: '', observaciones: '' });
                    }}
                    className="btn btn-secondary btn-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingVaccines || !vaccineForm.vacunaId}
                    className="btn btn-primary btn-md"
                  >
                    Agregar Vacuna
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vaccine Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteVaccineModal}
        onClose={() => {
          setShowDeleteVaccineModal(false);
          setDeleteVaccineId(null);
        }}
        onConfirm={confirmDeleteVaccine}
        title="Eliminar vacuna"
        message="¿Estás seguro de que deseas eliminar esta vacuna? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default VaccinationCards;

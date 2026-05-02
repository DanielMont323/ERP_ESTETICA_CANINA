import React, { useState, useEffect } from 'react';
import { petsAPI, customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Calendar,
  Scale,
  Edit,
  Trash2
} from 'lucide-react';

const Pets = () => {
  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    birthDate: '',
    weight: '',
    gender: '',
    ownerId: ''
  });

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, []);

  const fetchData = async () => {
    try {
      const petsRes = await petsAPI.getAll();
      console.log('Mascotas cargadas:', petsRes.data.data);
      setPets(petsRes.data.data);
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

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
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
      birthDate: new Date(pet.birthDate).toISOString().split('T')[0],
      weight: pet.weight,
      gender: pet.gender,
      ownerId: pet.owner?._id || ''
    });
    setShowModal(true);
  };

  const handleDeletePet = async (petId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta mascota?')) {
      try {
        console.log('Eliminando mascota:', petId);
        await petsAPI.delete(petId);
        toast.success('Mascota eliminada correctamente');
        await fetchData();
      } catch (error) {
        console.error('Error al eliminar mascota:', error);
        toast.error('Error al eliminar mascota');
      }
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
          <h1 className="text-2xl font-semibold text-gray-900">Mascotas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona la información de las mascotas
          </p>
        </div>
        <button onClick={handleCreatePet} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Mascota
        </button>
      </div>

      {/* Pets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets.map((pet) => (
          <div key={pet._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{pet.name}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="capitalize">{pet.type}</span> • {pet.breed}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {calculateAge(pet.birthDate)} años
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Scale className="h-4 w-4 mr-2" />
                      {pet.weight} kg
                    </div>
                    <div className="text-sm text-gray-600">
                      Dueño: {pet.owner?.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEditPet(pet)}
                    className="text-primary-600 hover:text-primary-900"
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
                {editingPet ? 'Editar Mascota' : 'Nueva Mascota'}
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
                <div>
                  <label className="form-label">Dueño (opcional)</label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({...formData, ownerId: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Sin dueño asignado</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
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
                    {editingPet ? 'Actualizar' : 'Crear'}
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

export default Pets;

import React, { useState, useEffect } from 'react';
import { remindersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2
} from 'lucide-react';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pago',
    priority: 'media',
    date: new Date().toISOString().split('T')[0],
    status: 'pendiente'
  });

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await remindersAPI.getAll();
      setReminders(response.data.data);
    } catch (error) {
      toast.error('Error al cargar recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (date) => {
    return new Date(date) < new Date();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return 'danger';
      case 'media': return 'warning';
      case 'baja': return 'success';
      default: return 'info';
    }
  };

  const handleCreateReminder = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      description: '',
      type: 'pago',
      priority: 'media',
      date: new Date().toISOString().split('T')[0],
      status: 'pendiente'
    });
    setShowModal(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      type: reminder.type,
      priority: reminder.priority,
      date: new Date(reminder.date).toISOString().split('T')[0],
      status: reminder.status
    });
    setShowModal(true);
  };

  const handleDeleteReminder = async (reminderId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este recordatorio?')) {
      try {
        await remindersAPI.delete(reminderId);
        toast.success('Recordatorio eliminado correctamente');
        fetchReminders();
      } catch (error) {
        toast.error('Error al eliminar recordatorio');
      }
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      await remindersAPI.complete(reminderId);
      toast.success('Recordatorio completado correctamente');
      fetchReminders();
    } catch (error) {
      toast.error('Error al completar recordatorio');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReminder) {
        await remindersAPI.update(editingReminder._id, formData);
        toast.success('Recordatorio actualizado correctamente');
      } else {
        await remindersAPI.create(formData);
        toast.success('Recordatorio creado correctamente');
      }
      setShowModal(false);
      fetchReminders();
    } catch (error) {
      toast.error('Error al guardar recordatorio');
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
          <h1 className="text-2xl font-semibold text-gray-900">Recordatorios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tus recordatorios y tareas pendientes
          </p>
        </div>
        <button onClick={handleCreateReminder} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Recordatorio
        </button>
      </div>

      {/* Reminders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reminders.map((reminder) => (
          <div key={reminder._id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{reminder.title}</h3>
                  {reminder.description && (
                    <p className="mt-1 text-sm text-gray-600">{reminder.description}</p>
                  )}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(reminder.date).toLocaleDateString('es-MX')}
                      {isOverdue(reminder.date) && (
                        <AlertTriangle className="h-4 w-4 ml-2 text-danger-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="capitalize badge badge-info">
                        {reminder.type}
                      </span>
                      <span className={`capitalize badge badge-${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {reminder.status === 'pendiente' && (
                    <button 
                      onClick={() => handleCompleteReminder(reminder._id)}
                      className="text-success-600 hover:text-success-900"
                      title="Marcar como completado"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditReminder(reminder)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteReminder(reminder._id)}
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
                {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="form-label">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                  <label className="form-label">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="form-input"
                  >
                    <option value="pago">Pago</option>
                    <option value="vacuna">Vacuna</option>
                    <option value="consulta">Consulta</option>
                    <option value="cita">Cita</option>
                    <option value="inventario">Inventario</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="form-input"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="form-input"
                  />
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
                    {editingReminder ? 'Actualizar' : 'Crear'}
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

export default Reminders;

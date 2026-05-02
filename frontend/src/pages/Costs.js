import React, { useState, useEffect } from 'react';
import { costsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

const Costs = () => {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'renta',
    type: 'fijo',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    frequency: 'único'
  });

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const response = await costsAPI.getAll();
      setCosts(response.data.data);
    } catch (error) {
      toast.error('Error al cargar costos');
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

  const handleCreateCost = () => {
    setEditingCost(null);
    setFormData({
      description: '',
      category: 'renta',
      type: 'fijo',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      frequency: 'único'
    });
    setShowModal(true);
  };

  const handleEditCost = (cost) => {
    setEditingCost(cost);
    setFormData({
      description: cost.description,
      category: cost.category,
      type: cost.type,
      amount: cost.amount,
      date: new Date(cost.date).toISOString().split('T')[0],
      frequency: cost.frequency
    });
    setShowModal(true);
  };

  const handleDeleteCost = async (costId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este costo?')) {
      try {
        await costsAPI.delete(costId);
        toast.success('Costo eliminado correctamente');
        fetchCosts();
      } catch (error) {
        toast.error('Error al eliminar costo');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCost) {
        await costsAPI.update(editingCost._id, formData);
        toast.success('Costo actualizado correctamente');
      } else {
        await costsAPI.create(formData);
        toast.success('Costo creado correctamente');
      }
      setShowModal(false);
      fetchCosts();
    } catch (error) {
      toast.error('Error al guardar costo');
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
          <h1 className="text-2xl font-semibold text-gray-900">Costos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los costos fijos y variables del negocio
          </p>
        </div>
        <button onClick={handleCreateCost} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Costo
        </button>
      </div>

      {/* Costs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Frecuencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr key={cost._id}>
                  <td className="font-medium">{cost.description}</td>
                  <td>
                    <span className="capitalize badge badge-info">
                      {cost.category}
                    </span>
                  </td>
                  <td>
                    <span className={`capitalize badge badge-${
                      cost.type === 'fijo' ? 'success' : 'warning'
                    }`}>
                      {cost.type}
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(cost.amount)}
                  </td>
                  <td>
                    {new Date(cost.date).toLocaleDateString('es-MX')}
                  </td>
                  <td>
                    <span className="capitalize">{cost.frequency}</span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditCost(cost)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCost(cost._id)}
                        className="text-danger-600 hover:text-danger-900"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCost ? 'Editar Costo' : 'Nuevo Costo'}
              </h3>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="form-label">Descripción</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    <option value="renta">Renta</option>
                    <option value="servicios">Servicios</option>
                    <option value="nomina">Nómina</option>
                    <option value="materiales">Materiales</option>
                    <option value="marketing">Marketing</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="impuestos">Impuestos</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="form-input"
                  >
                    <option value="fijo">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="form-input"
                  />
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
                <div>
                  <label className="form-label">Frecuencia</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="form-input"
                  >
                    <option value="único">Único</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
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
                    {editingCost ? 'Actualizar' : 'Crear'}
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

export default Costs;

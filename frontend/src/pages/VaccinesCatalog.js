import React, { useState, useEffect } from 'react';
import { vaccinesAPI, productsAPI } from '../services/api';
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
  const [typeFilter, setTypeFilter] = useState('all'); // all, vacuna, desparasitante

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Solo administradores pueden acceder al catálogo de vacunas');
      return;
    }
    fetchVaccines();
  }, [user]);

  const fetchVaccines = async () => {
    try {
      const params = {};
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      console.log('=== AUDITORÍA FRONTEND CATÁLOGO ===');
      console.log('Params:', params);
      const response = await vaccinesAPI.getAll(params);
      console.log('Response:', response);
      console.log('Response.data:', response.data);
      console.log('Response.data.data:', response.data.data);
      setVaccines(response.data.data);
    } catch (error) {
      console.error('Error al cargar vacunas:', error);
      toast.error('Error al cargar vacunas y desparasitantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccines();
  }, [typeFilter]);

  const filteredVaccines = vaccines.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    return <SkeletonTable rows={5} columns={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Catálogo de Vacunas y Desparasitantes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona el catálogo de vacunas y desparasitantes del sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar vacunas/desparasitantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input w-48"
            >
              <option value="all">Todos</option>
              <option value="vacuna">Vacunas</option>
              <option value="desparasitante">Desparasitantes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vaccines Table */}
      <div className="card">
        <div className="table-container">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredVaccines.map((vaccine) => (
                <tr key={vaccine._id}>
                  <td className="font-medium">{vaccine.name}</td>
                  <td className="text-gray-600">{vaccine.categoryName || '-'}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        vaccine.type === 'vacuna'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {vaccine.type === 'vacuna' ? 'VACUNA' : 'DESPARASITANTE'}
                    </span>
                  </td>
                  <td className="text-gray-600">{vaccine.sku || '-'}</td>
                  <td className="text-gray-600">${vaccine.price ? vaccine.price.toFixed(2) : '0.00'}</td>
                  <td className="text-gray-600">{vaccine.stock}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        vaccine.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vaccine.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VaccinesCatalog;

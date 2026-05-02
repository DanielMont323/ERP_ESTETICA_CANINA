import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle
} from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'alimentos',
    cost: '',
    price: '',
    stock: '',
    minStock: '5'
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock)
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct._id, data);
        toast.success('Producto actualizado correctamente');
      } else {
        await productsAPI.create(data);
        toast.success('Producto creado correctamente');
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar producto');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      cost: product.cost.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas desactivar este producto?')) {
      try {
        await productsAPI.delete(id);
        toast.success('Producto desactivado correctamente');
        fetchProducts();
      } catch (error) {
        toast.error('Error al desactivar producto');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'alimentos',
      cost: '',
      price: '',
      stock: '',
      minStock: '5'
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'low-stock' && product.stock <= product.minStock) ||
      (filter === 'out-of-stock' && product.stock === 0);
    return matchesSearch && matchesFilter && product.isActive;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) return { color: 'danger', text: 'Agotado' };
    if (product.stock <= product.minStock) return { color: 'warning', text: 'Bajo stock' };
    return { color: 'success', text: 'Disponible' };
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
          <h1 className="text-2xl font-semibold text-gray-900">Productos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tu inventario de productos
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('low-stock')}
                className={`btn btn-sm ${filter === 'low-stock' ? 'btn-warning' : 'btn-secondary'}`}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Bajo Stock
              </button>
              <button
                onClick={() => setFilter('out-of-stock')}
                className={`btn btn-sm ${filter === 'out-of-stock' ? 'btn-danger' : 'btn-secondary'}`}
              >
                Agotados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Margen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <tr key={product._id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                    </td>
                    <td>
                      <span className="capitalize">{product.category}</span>
                    </td>
                    <td>
                      <div className="text-right">
                        <p className="font-medium">{product.stock}</p>
                        <p className="text-sm text-gray-500">Mín: {product.minStock}</p>
                      </div>
                    </td>
                    <td className="text-right">{formatCurrency(product.cost)}</td>
                    <td className="text-right">{formatCurrency(product.price)}</td>
                    <td className="text-right">
                      <span className={`font-medium ${
                        product.margin > 30 ? 'text-success-600' : 
                        product.margin > 15 ? 'text-warning-600' : 'text-danger-600'
                      }`}>
                        {product.margin}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-danger-600 hover:text-danger-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nombre del producto</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      <option value="alimentos">Alimentos</option>
                      <option value="accesorios">Accesorios</option>
                      <option value="medicamentos">Medicamentos</option>
                      <option value="juguetes">Juguetes</option>
                      <option value="higiene">Higiene</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Costo</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.cost}
                        onChange={(e) => setFormData({...formData, cost: e.target.value})}
                        className="form-input"
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Stock inicial</label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Stock mínimo</label>
                      <input
                        type="number"
                        required
                        value={formData.minStock}
                        onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
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
                    {editingProduct ? 'Actualizar' : 'Crear'}
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

export default Products;

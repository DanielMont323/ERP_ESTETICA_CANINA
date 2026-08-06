import React, { useState, useEffect } from 'react';
import { productsAPI, productCategoriesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
    price: '',
    stock: '',
    minStock: '5',
    sku: '',
    discountPercentage: '0'
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await productCategoriesAPI.getAll({ active: true });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
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
        minStock: parseInt(formData.minStock),
        discountPercentage: parseFloat(formData.discountPercentage) || 0
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
      category: product.category?._id || product.category,
      cost: product.cost.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      sku: product.sku || '',
      discountPercentage: (product.discountPercentage || 0).toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteProductId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await productsAPI.delete(deleteProductId);
      toast.success('Producto desactivado correctamente');
      fetchProducts();
    } catch (error) {
      toast.error('Error al desactivar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      cost: '',
      price: '',
      stock: '',
      minStock: '5',
      sku: '',
      discountPercentage: '0'
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
    return <SkeletonTable rows={5} columns={8} />;
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
                <th>Descuento</th>
                <th>Precio Final</th>
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
                      <span>{product.category?.name || 'Sin categoría'}</span>
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
                      {product.discountPercentage > 0 ? (
                        <span className="text-success-600 font-medium">{product.discountPercentage}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right font-semibold">
                      {product.discountPercentage > 0 ? (
                        <div>
                          <span className="text-gray-400 line-through text-sm">{formatCurrency(product.price)}</span>
                          <div className="text-success-600">{formatCurrency(product.price * (1 - product.discountPercentage / 100))}</div>
                        </div>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </td>
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
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-md w-full p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      className="form-input"
                      placeholder="Se generará automáticamente si se deja vacío"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Descuento (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({...formData, discountPercentage: e.target.value})}
                      className="form-input"
                      placeholder="0 para sin descuento"
                    />
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
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteProductId(null);
        }}
        onConfirm={confirmDelete}
        title="Desactivar producto"
        message="¿Estás seguro de que deseas desactivar este producto? Esta acción se puede deshacer más tarde."
        confirmText="Desactivar"
        type="danger"
      />
    </div>
  );
};

export default Products;

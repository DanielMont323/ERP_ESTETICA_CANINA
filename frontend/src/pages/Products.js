import React, { useState, useEffect, useCallback, useRef } from 'react';
import { productsAPI, productCategoriesAPI, suppliersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Autocomplete from '../components/Autocomplete';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  EyeOff
} from 'lucide-react';

const Products = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'user';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    cost: '',
    price: '',
    stock: '',
    minStock: '5',
    idealStock: '',
    sku: '',
    discountPercentage: '0',
    expirationDate: ''
  });
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const nameInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (showInactive !== undefined || showDeleted !== undefined) {
      fetchProducts();
    }
  }, [showInactive, showDeleted]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, filter]);

  // Listener para evento personalizado de F2 contextual (nuevo producto)
  useEffect(() => {
    const handleOpenNewProduct = () => {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: '',
        supplier: '',
        cost: '',
        price: '',
        stock: '',
        minStock: '5',
        idealStock: '',
        sku: '',
        discountPercentage: '0',
        expirationDate: ''
      });
      setShowModal(true);
      // Colocar foco en el campo nombre después de que el modal se abra
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('openNewProduct', handleOpenNewProduct);
    return () => window.removeEventListener('openNewProduct', handleOpenNewProduct);
  }, []);

  // Navegación por teclado en formulario
  useKeyboardFormNavigation(formRef, showModal);

  // Manejo de ESC para cerrar modal
  useEscapeKey(() => setShowModal(false), showModal);

  const fetchProducts = async () => {
    try {
      if (showDeleted && userRole === 'admin') {
        const response = await productsAPI.getArchived();
        setProducts(response.data.data);
      } else {
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };
        if (showInactive && userRole === 'admin') {
          params.active = 'false';
        }
        if (searchTerm) {
          params.search = searchTerm;
        }
        if (filter === 'low-stock') {
          params.lowStock = 'true';
        }
        if (filter === 'out-of-stock') {
          params.active = 'true'; // Solo activos
          // Backend no tiene filtro específico para out-of-stock, filtraremos en frontend
        }
        const response = await productsAPI.getAll(params);
        setProducts(response.data.data);
        setPagination(response.data.pagination || pagination);
      }
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

  // Fetch categories for autocomplete
  const fetchCategoriesForAutocomplete = async (searchQuery) => {
    try {
      const response = await productCategoriesAPI.getAll({ search: searchQuery });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar categorías:', error);
      return [];
    }
  };

  // Fetch suppliers for autocomplete
  const fetchSuppliersForAutocomplete = async (searchQuery) => {
    try {
      const response = await suppliersAPI.getAll({ search: searchQuery, limit: 1000 });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      return [];
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar SKU obligatorio
    if (!formData.sku || formData.sku.trim() === '') {
      toast.error('El SKU es obligatorio');
      return;
    }
    
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        idealStock: formData.idealStock ? parseInt(formData.idealStock) : null,
        discountPercentage: parseFloat(formData.discountPercentage) || 0,
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : null
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
      supplier: product.supplier?._id || product.supplier || '',
      cost: product.cost.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      idealStock: product.idealStock ? product.idealStock.toString() : '',
      sku: product.sku || '',
      discountPercentage: (product.discountPercentage || 0).toString(),
      expirationDate: product.expirationDate ? new Date(product.expirationDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteProductId(id);
    setShowDeleteModal(true);
  };

  const getProductToDelete = () => {
    return products.find(p => p._id === deleteProductId);
  };

  const confirmDelete = async () => {
    try {
      const response = await productsAPI.delete(deleteProductId);
      if (response.data.action === 'archived') {
        toast.success('Producto archivado correctamente');
      } else {
        toast.success('Producto eliminado definitivamente');
      }
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const handleRestore = async (id) => {
    try {
      await productsAPI.restore(id);
      toast.success('Producto restaurado correctamente');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al restaurar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      supplier: '',
      cost: '',
      price: '',
      stock: '',
      minStock: '5',
      idealStock: '',
      sku: '',
      discountPercentage: '0',
      expirationDate: ''
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesActive = showInactive && userRole === 'admin' ? true : product.isActive;
    const matchesOutOfStock = filter === 'out-of-stock' ? product.stock === 0 : true;
    return matchesActive && matchesOutOfStock;
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

  const getExpirationStatus = (product) => {
    if (!product.expirationDate) return { color: 'gray', text: 'Sin fecha' };
    
    const today = new Date();
    const expirationDate = new Date(product.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) return { color: 'danger', text: 'Caducado' };
    if (daysUntilExpiration <= 30) return { color: 'warning', text: `Próximo (${daysUntilExpiration}d)` };
    return { color: 'success', text: 'Vigente' };
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
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className={`btn btn-sm ${showInactive ? 'btn-info' : 'btn-secondary'}`}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  {showInactive ? 'Ocultar Inactivos' : 'Mostrar Inactivos'}
                </button>
              )}
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={`btn btn-sm ${showDeleted ? 'btn-danger' : 'btn-secondary'}`}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {showDeleted ? 'Ocultar Eliminados' : 'Mostrar Eliminados'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Descuento</th>
                <th>Precio Final</th>
                <th>Margen</th>
                <th>Caducidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const expirationStatus = getExpirationStatus(product);
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
                      <span>{product.supplier?.name || 'Sin proveedor'}</span>
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
                      <span className={`badge badge-${expirationStatus.color}`}>
                        {expirationStatus.text}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        {showDeleted ? (
                          <button
                            onClick={() => handleRestore(product._id)}
                            className="text-success-600 hover:text-success-900"
                            title="Restaurar producto"
                          >
                            ♻️
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-brand-burgundy hover:text-primary-900"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="text-danger-600 hover:text-danger-900"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
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
          
          {!showDeleted && (
            <Pagination
              pagination={pagination}
              onPageChange={(page) => setPagination({ ...pagination, page })}
              onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-visible">
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          
          <div className="relative modal-content max-w-md w-full p-6 animate-slide-up max-h-[90vh] overflow-visible">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            
            <form ref={formRef} onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Nombre del producto</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <label className="form-label">Categoría</label>
                  <Autocomplete
                    placeholder="Buscar categoría..."
                    localOptions={categories}
                    displayValue={(item) => item.name}
                    getOptionValue={(item) => item._id}
                    value={categories.find(c => c._id === formData.category) || null}
                    onChange={(value) => setFormData({...formData, category: value})}
                    minLength={1}
                  />
                </div>
                
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <label className="form-label">Proveedor</label>
                  <Autocomplete
                    placeholder="Buscar proveedor..."
                    localOptions={suppliers}
                    displayValue={(item) => item.name}
                    getOptionValue={(item) => item._id}
                    value={suppliers.find(s => s._id === formData.supplier) || null}
                    onChange={(value) => setFormData({...formData, supplier: value})}
                    minLength={1}
                  />
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
                      min="0"
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
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Stock ideal</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.idealStock}
                      onChange={(e) => setFormData({...formData, idealStock: e.target.value})}
                      className="form-input"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Control de caducidad</h4>
                <div>
                  <label className="form-label">Fecha de caducidad</label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
                    className="form-input"
                  />
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
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteProductId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar producto"
        message={
          <div>
            <p className="mb-2">¿Estás seguro de que deseas eliminar este producto?</p>
            {getProductToDelete() && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <p><strong>Nombre:</strong> {getProductToDelete().name}</p>
                <p><strong>SKU:</strong> {getProductToDelete().sku}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-gray-600">
              Si el producto tiene historial de operaciones, será archivado en lugar de eliminarse definitivamente.
            </p>
          </div>
        }
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};

export default Products;

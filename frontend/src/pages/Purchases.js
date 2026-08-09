import React, { useState, useEffect, useCallback } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, supplierProductsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  Search,
  Plus,
  X,
  TrendingDown
} from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [formData, setFormData] = useState({
    proveedor: '',
    type: 'contado',
    paymentMethod: 'efectivo',
    user: 'default_user',
    items: [],
    notes: '',
    invoice: '',
    receiptNumber: '',
    hasIVA: false,
    ivaRate: 0.16
  });
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: 1,
    unitCost: 0
  });
  const [discountInfo, setDiscountInfo] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (selectedSupplier) params.proveedor = selectedSupplier;
      if (skuSearch) params.sku = skuSearch;
      const purchasesRes = await purchasesAPI.getAll(params);
      setPurchases(purchasesRes.data.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, skuSearch]);

  useEffect(() => {
    fetchData();
    fetchSuppliers();
    fetchProducts();
  }, [fetchData]);

  const fetchSuppliers = async () => {
    try {
      const suppliersRes = await suppliersAPI.getAll();
      setSuppliers(suppliersRes.data.data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsRes = await productsAPI.getAll();
      setProducts(productsRes.data.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleAddItem = async () => {
    if (!currentItem.product || currentItem.quantity <= 0 || currentItem.unitCost <= 0) {
      toast.error('Completa todos los campos del item');
      return;
    }

    const newItem = { ...currentItem };
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
    setCurrentItem({ product: '', quantity: 1, unitCost: 0 });
    setDiscountInfo(null);
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleProductChange = async (productId) => {
    const product = products.find(p => p._id === productId);
    setCurrentItem({
      ...currentItem,
      product: productId,
      unitCost: product?.cost || 0
    });

    // Buscar condiciones de descuento si hay proveedor seleccionado
    if (formData.proveedor && productId) {
      try {
        const supplierProductsRes = await supplierProductsAPI.getAll({
          supplier: formData.proveedor,
          product: productId,
          active: true
        });
        
        if (supplierProductsRes.data.data.length > 0) {
          const supplierProduct = supplierProductsRes.data.data[0];
          setDiscountInfo({
            discountPercentage: supplierProduct.discountPercentage,
            discountDays: supplierProduct.discountDays,
            baseCost: supplierProduct.baseCost
          });
          
          // Actualizar el costo unitario con el costo base del proveedor
          setCurrentItem({
            ...currentItem,
            product: productId,
            unitCost: supplierProduct.baseCost
          });
        } else {
          setDiscountInfo(null);
        }
      } catch (error) {
        console.error('Error al buscar descuentos:', error);
        setDiscountInfo(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.items.length === 0) {
        toast.error('Agrega al menos un item');
        return;
      }

      console.log('Enviando datos de compra:', formData);
      const response = await purchasesAPI.create(formData);
      console.log('Respuesta del servidor:', response);
      toast.success('Compra creada correctamente');
      setShowModal(false);
      setFormData({
        proveedor: '',
        type: 'contado',
        paymentMethod: 'efectivo',
        user: 'default_user',
        items: [],
        notes: '',
        invoice: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error al crear compra:', error);
      console.error('Detalles del error:', error.response?.data);
      toast.error(`Error: ${error.response?.data?.message || 'Error al crear compra'}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const calculateSavings = () => {
    if (!discountInfo || !currentItem.unitCost) return 0;
    const baseTotal = currentItem.unitCost * currentItem.quantity;
    return baseTotal * (discountInfo.discountPercentage / 100);
  };

  const calculateBaseTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const filteredPurchases = selectedSupplier 
    ? purchases.filter(p => p.proveedor?._id === selectedSupplier)
    : purchases;

  if (loading) {
    return <SkeletonTable rows={5} columns={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compras</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las compras a proveedores con descuentos por pronto pago
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Compra
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <label className="form-label">Filtrar por proveedor</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="form-input"
              >
                <option value="">Todos los proveedores</option>
                {suppliers.map(supplier => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Buscar por SKU</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="SKU del producto..."
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Productos</th>
                <th>Total Base</th>
                <th>Descuento</th>
                <th>Total Final</th>
                <th>Tipo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => (
                <tr key={purchase._id}>
                  <td>{new Date(purchase.date).toLocaleDateString()}</td>
                  <td>{purchase.proveedor?.name}</td>
                  <td>
                    {purchase.items?.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        {item.product?.name} x {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td>{formatCurrency(purchase.baseTotal || purchase.total)}</td>
                  <td className="text-green-600">
                    {purchase.totalDiscount > 0 ? formatCurrency(purchase.totalDiscount) : '-'}
                  </td>
                  <td className="font-semibold">
                    {formatCurrency(purchase.total)}
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${
                      purchase.type === 'contado' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {purchase.type}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${
                      purchase.status === 'pagada' ? 'bg-green-100 text-green-800' : 
                      purchase.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for New Purchase */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Nueva Compra</h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Proveedor</label>
                    <select
                      required
                      value={formData.proveedor}
                      onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                      className="form-input"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tipo de compra</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-input"
                    >
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Número de Factura</label>
                    <input
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({...formData, invoice: e.target.value})}
                      className="form-input"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="form-label">Número de Recibo</label>
                    <input
                      type="text"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})}
                      className="form-input"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-3">Agregar Productos</h3>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="form-label">Producto</label>
                      <select
                        value={currentItem.product}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Seleccionar producto</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Costo Unitario</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.unitCost}
                        onChange={(e) => setCurrentItem({...currentItem, unitCost: parseFloat(e.target.value)})}
                        className="form-input"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="btn btn-primary btn-md w-full"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Discount Info */}
                  {discountInfo && (
                    <div className="bg-success-50 border border-success-200 rounded-xl p-3 mb-4">
                      <div className="flex items-center text-success-700">
                        <TrendingDown className="h-5 w-5 mr-2" />
                        <div>
                          <p className="font-semibold">
                            {discountInfo.discountPercentage}% de descuento disponible
                          </p>
                          <p className="text-sm">
                            Ahorra {formatCurrency(calculateSavings())} si pagas en {discountInfo.discountDays} días
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-3 bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-2">Producto</th>
                            <th className="text-left py-2">Cantidad</th>
                            <th className="text-left py-2">Costo Unitario</th>
                            <th className="text-left py-2">Subtotal</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td>{products.find(p => p._id === item.product)?.name}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.unitCost)}</td>
                              <td>{formatCurrency(item.quantity * item.unitCost)}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-danger-600 hover:text-danger-900 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* IVA Section - Solo para compras a crédito */}
                {formData.type === 'credito' && (
                  <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="hasIVA"
                        checked={formData.hasIVA}
                        onChange={(e) => setFormData({...formData, hasIVA: e.target.checked})}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="hasIVA" className="ml-2 block text-sm font-medium text-gray-900">
                        Aplicar IVA
                      </label>
                    </div>
                    
                    {formData.hasIVA && (
                      <div className="space-y-2 ml-6">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Tasa de IVA:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={formData.ivaRate}
                            onChange={(e) => setFormData({...formData, ivaRate: parseFloat(e.target.value)})}
                            className="form-input w-24"
                          />
                          <span className="text-sm text-gray-600">{(formData.ivaRate * 100).toFixed(0)}%</span>
                        </div>
                        
                        {formData.items.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 mt-2">
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(calculateBaseTotal())}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">IVA ({(formData.ivaRate * 100).toFixed(0)}%):</span>
                                <span className="font-medium">{formatCurrency(calculateBaseTotal() * formData.ivaRate)}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-200 pt-1">
                                <span className="font-semibold">Total con IVA:</span>
                                <span className="font-semibold text-primary-600">
                                  {formatCurrency(calculateBaseTotal() * (1 + formData.ivaRate))}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Método de pago</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                      className="form-input"
                      disabled={formData.type === 'credito'}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Factura</label>
                    <input
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({...formData, invoice: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="form-input"
                    rows="2"
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
                    Crear Compra
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Purchases;

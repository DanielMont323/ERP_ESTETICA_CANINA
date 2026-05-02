import React, { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, supplierProductsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  X,
  DollarSign,
  TrendingDown
} from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    proveedor: '',
    type: 'contado',
    paymentMethod: 'efectivo',
    user: 'default_user',
    items: [],
    notes: '',
    invoice: ''
  });
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: 1,
    unitCost: 0
  });
  const [discountInfo, setDiscountInfo] = useState(null);

  useEffect(() => {
    fetchData();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchData = async () => {
    try {
      const purchasesRes = await purchasesAPI.getAll();
      setPurchases(purchasesRes.data.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

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
              {purchases.map((purchase) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nueva Compra</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
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

                {/* Items Section */}
                <div className="border rounded-lg p-4 mb-4">
                  <h3 className="font-semibold mb-3">Agregar Productos</h3>
                  
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
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center text-green-700">
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
                    <div className="border rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left">Producto</th>
                            <th className="text-left">Cantidad</th>
                            <th className="text-left">Costo Unitario</th>
                            <th className="text-left">Subtotal</th>
                            <th></th>
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
                                  className="text-red-600 hover:text-red-800"
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
      )}
    </div>
  );
};

export default Purchases;

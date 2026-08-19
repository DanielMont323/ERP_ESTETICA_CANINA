import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { purchasesAPI, suppliersAPI, productsAPI, supplierProductsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Plus,
  X,
  TrendingDown,
  Edit
} from 'lucide-react';

const Purchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
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
  const [selectedSupplierInfo, setSelectedSupplierInfo] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const productSearchInputRef = useRef(null);
  const formRef = useRef(null);

  // Listener para evento personalizado de F4 contextual (nueva compra)
  useEffect(() => {
    const handleOpenNewPurchase = () => {
      setShowModal(true);
      setIsEditMode(false);
      setSelectedPurchase(null);
      // Colocar foco en el campo de búsqueda de producto después de que el modal se abra
      setTimeout(() => {
        productSearchInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('openNewPurchase', handleOpenNewPurchase);
    return () => window.removeEventListener('openNewPurchase', handleOpenNewPurchase);
  }, []);

  // Navegación por teclado en formulario
  useKeyboardFormNavigation(formRef, showModal);

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
  }, [fetchData]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  // Atajo ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        setIsEditMode(false);
        setSelectedPurchase(null);
        setProductSearchQuery('');
        setSearchResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

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

  // Búsqueda de productos con debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productSearchQuery.trim()) {
        try {
          const response = await productsAPI.search(productSearchQuery);
          setSearchResults(response.data.data);
        } catch (error) {
          console.error('Error searching products:', error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearchQuery]);

  // Manejo de ENTER para escaneo de SKU
  const handleProductSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!productSearchQuery.trim()) return;

      try {
        const response = await productsAPI.search(productSearchQuery);
        const results = response.data.data;

        if (results.length === 1) {
          // Producto único encontrado - agregar automáticamente
          const product = results[0];
          await handleProductChange(product._id);
          
          // Verificar si ya existe en items para incrementar cantidad
          const existingItemIndex = formData.items.findIndex(
            item => item.product === product._id
          );

          if (existingItemIndex >= 0) {
            // Incrementar cantidad
            const updatedItems = [...formData.items];
            updatedItems[existingItemIndex].quantity += 1;
            setFormData({ ...formData, items: updatedItems });
            toast.success(`${product.name} cantidad incrementada a ${updatedItems[existingItemIndex].quantity}`);
          } else {
            // Agregar nuevo item
            const newItem = {
              product: product._id,
              quantity: 1,
              unitCost: product.cost || 0
            };
            setFormData({ ...formData, items: [...formData.items, newItem] });
            toast.success(`${product.name} agregado a la compra`);
          }

          setProductSearchQuery('');
          setSearchResults([]);
          
          // Mantener foco en el campo para escaneo continuo
          setTimeout(() => {
            productSearchInputRef.current?.focus();
          }, 100);
        } else if (results.length === 0) {
          toast.error('Producto no encontrado');
          setProductSearchQuery('');
          setSearchResults([]);
        } else {
          // Múltiples resultados - mostrar en lista dropdown
          setSearchResults(results);
        }
      } catch (error) {
        toast.error('Error al buscar producto');
      }
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

  const handleSupplierChange = async (supplierId) => {
    setFormData({...formData, proveedor: supplierId});
    setDiscountInfo(null);
    
    if (supplierId) {
      const supplier = suppliers.find(s => s._id === supplierId);
      setSelectedSupplierInfo(supplier);
    } else {
      setSelectedSupplierInfo(null);
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
      
      let response;
      if (isEditMode) {
        response = await purchasesAPI.update(selectedPurchase._id, formData);
      } else {
        response = await purchasesAPI.create(formData);
      }
      
      console.log('Respuesta del servidor:', response);
      toast.success(isEditMode ? 'Compra actualizada correctamente' : 'Compra creada correctamente');
      setShowModal(false);
      setIsEditMode(false);
      setSelectedPurchase(null);
      setProductSearchQuery('');
      setSearchResults([]);
      setFormData({
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
      fetchData();
    } catch (error) {
      console.error('Error al guardar compra:', error);
      console.error('Detalles del error:', error.response?.data);
      toast.error(`Error: ${error.response?.data?.message || 'Error al guardar compra'}`);
    }
  };

  const handleEditClick = (purchase) => {
    setSelectedPurchase(purchase);
    setIsEditMode(true);
    
    // Cargar datos de la compra en el formulario
    setFormData({
      proveedor: purchase.proveedor?._id || '',
      type: purchase.type || 'contado',
      paymentMethod: purchase.paymentMethod || 'efectivo',
      user: purchase.user || 'default_user',
      items: purchase.items || [],
      notes: purchase.notes || '',
      invoice: purchase.invoice || '',
      receiptNumber: purchase.receiptNumber || '',
      hasIVA: purchase.hasIVA || false,
      ivaRate: purchase.ivaRate || 0.16
    });
    
    // Cargar información del proveedor para descuento
    if (purchase.proveedor) {
      const supplierInfo = suppliers.find(s => s._id === purchase.proveedor._id);
      if (supplierInfo) {
        setSelectedSupplierInfo(supplierInfo);
        setDiscountInfo({
          discountPercentage: supplierInfo.earlyPaymentDiscount || 0,
          creditDays: supplierInfo.creditDays || 0
        });
      }
    }
    
    setShowModal(true);
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

  const calculateEarlyPaymentDiscount = () => {
    if (formData.type !== 'credito' || !selectedSupplierInfo || !selectedSupplierInfo.earlyPaymentDiscount) {
      return 0;
    }
    const baseTotal = calculateBaseTotal();
    return baseTotal * (selectedSupplierInfo.earlyPaymentDiscount / 100);
  };

  const calculateTotalWithDiscount = () => {
    const baseTotal = calculateBaseTotal();
    const discount = calculateEarlyPaymentDiscount();
    return baseTotal - discount;
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
        <div className="table-container">
          <table className="table table-responsive">
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
                {user?.role === 'admin' && <th>Acciones</th>}
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
                  {user?.role === 'admin' && (
                    <td>
                      <button
                        onClick={() => handleEditClick(purchase)}
                        disabled={purchase.status === 'cancelada'}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Editar compra"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  )}
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
            
            <div ref={formRef} className="relative modal-content max-w-4xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isEditMode ? 'Editar Compra' : 'Nueva Compra'}
                  </h2>
                  <button onClick={() => {
                    setShowModal(false);
                    setIsEditMode(false);
                    setSelectedPurchase(null);
                    setProductSearchQuery('');
                    setSearchResults([]);
                  }} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {selectedSupplierInfo && (
                      <div className="mt-2 text-sm space-y-1">
                        <div className="text-gray-600">
                          Crédito: {selectedSupplierInfo.creditDays > 0 ? `${selectedSupplierInfo.creditDays} días` : 'Contado'}
                        </div>
                        {selectedSupplierInfo.earlyPaymentDiscount > 0 && (
                          <div className="text-green-600 font-medium">
                            Descuento pronto pago: {selectedSupplierInfo.earlyPaymentDiscount}%
                          </div>
                        )}
                      </div>
                    )}
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
                  
                  {/* Campo de búsqueda por nombre o SKU con lector de código de barras */}
                  <div className="mb-4">
                    <label className="form-label">Buscar producto por nombre o SKU...</label>
                    <input
                      ref={productSearchInputRef}
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      onKeyDown={handleProductSearchKeyDown}
                      className="form-input"
                      placeholder="Escribe o escanea código de barras..."
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                        {searchResults.map(product => (
                          <div
                            key={product._id}
                            onClick={async () => {
                              await handleProductChange(product._id);
                              const newItem = {
                                product: product._id,
                                quantity: 1,
                                unitCost: product.cost || 0
                              };
                              setFormData({ ...formData, items: [...formData.items, newItem] });
                              setProductSearchQuery('');
                              setSearchResults([]);
                              toast.success(`${product.name} agregado a la compra`);
                            }}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            <p className="text-sm font-medium text-brand-burgundy">
                              Costo: {formatCurrency(product.cost)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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

                  {/* Purchase Summary - Always show when there are items */}
                  {formData.items.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-3">Resumen de Compra</h4>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal / Total sin descuento:</span>
                          <span className="font-medium">{formatCurrency(calculateBaseTotal())}</span>
                        </div>
                        {formData.type === 'credito' && calculateEarlyPaymentDiscount() > 0 && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span className="text-gray-600">Descuento pronto pago ({selectedSupplierInfo?.earlyPaymentDiscount}%):</span>
                              <span className="font-medium">-{formatCurrency(calculateEarlyPaymentDiscount())}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total por pronto pago:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(calculateTotalWithDiscount())}</span>
                            </div>
                            <div className="flex justify-between text-green-600 text-xs pt-1 border-t border-green-200">
                              <span>Ahorro:</span>
                              <span className="font-medium">{formatCurrency(calculateEarlyPaymentDiscount())}</span>
                            </div>
                          </>
                        )}
                        {formData.type === 'credito' && calculateEarlyPaymentDiscount() === 0 && (
                          <div className="flex justify-between text-gray-500 text-xs">
                            <span>Descuento pronto pago:</span>
                            <span>No disponible</span>
                          </div>
                        )}
                        {formData.type === 'contado' && (
                          <div className="flex justify-between text-gray-500 text-xs">
                            <span>Descuento pronto pago:</span>
                            <span>No aplica en contado</span>
                          </div>
                        )}
                      </div>
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
                        className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
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
                                <span className="text-gray-600">Base para IVA:</span>
                                <span className="font-medium">{formatCurrency(formData.type === 'credito' && calculateEarlyPaymentDiscount() > 0 ? calculateTotalWithDiscount() : calculateBaseTotal())}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">IVA ({(formData.ivaRate * 100).toFixed(0)}%):</span>
                                <span className="font-medium">{formatCurrency((formData.type === 'credito' && calculateEarlyPaymentDiscount() > 0 ? calculateTotalWithDiscount() : calculateBaseTotal()) * formData.ivaRate)}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-200 pt-1">
                                <span className="font-semibold">Total con IVA:</span>
                                <span className="font-semibold text-brand-burgundy">
                                  {formData.type === 'credito' && calculateEarlyPaymentDiscount() > 0
                                    ? formatCurrency((calculateTotalWithDiscount() * (1 + formData.ivaRate)))
                                    : formatCurrency(calculateBaseTotal() * (1 + formData.ivaRate))
                                  }
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
                    onClick={() => {
                      setShowModal(false);
                      setProductSearchQuery('');
                      setSearchResults([]);
                    }}
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

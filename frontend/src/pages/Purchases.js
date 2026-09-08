import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { purchasesAPI, suppliersAPI, productsAPI, supplierProductsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import Autocomplete from '../components/Autocomplete';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
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
    ivaRate: 0.16,
    date: ''
  });
  const [currentItem, setCurrentItem] = useState({
    product: '',
    productName: '',
    quantity: 1,
    unitCost: 0,
    hasTax: false,
    taxRate: 0.16,
    costIncludesTax: false
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discountInfo, setDiscountInfo] = useState(null);
  const [selectedSupplierInfo, setSelectedSupplierInfo] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const productSearchInputRef = useRef(null);
  const formRef = useRef(null);

  // Función para reiniciar el formulario a valores iniciales
  const resetForm = () => {
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
      ivaRate: 0.16,
      date: ''
    });
    setCurrentItem({
      product: '',
      productName: '',
      quantity: 1,
      unitCost: 0,
      hasTax: false,
      taxRate: 0.16,
      costIncludesTax: false
    });
    setSelectedProduct(null);
    setDiscountInfo(null);
    setSelectedSupplierInfo(null);
    setProductSearchQuery('');
    setSearchResults([]);
    setEditingItemIndex(null);
  };

  // Listener para evento personalizado de F4 contextual (nueva compra)
  useEffect(() => {
    const handleOpenNewPurchase = () => {
      resetForm();
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
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (selectedSupplier) params.proveedor = selectedSupplier;
      if (skuSearch) params.sku = skuSearch;
      const purchasesRes = await purchasesAPI.getAll(params);
      setPurchases(purchasesRes.data.data);
      setPagination(purchasesRes.data.pagination || pagination);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, skuSearch, pagination.page, pagination.limit]);

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
        resetForm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const fetchSuppliers = async () => {
    try {
      const suppliersRes = await suppliersAPI.getAll({ limit: 1000 });
      setSuppliers(suppliersRes.data.data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
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

  // Fetch products for autocomplete
  const fetchProductsForAutocomplete = async (searchQuery) => {
    try {
      const response = await productsAPI.search(searchQuery);
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar productos:', error);
      return [];
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
          // Producto único encontrado - cargar en currentItem
          const product = results[0];
          await handleProductChange(product._id);

          setProductSearchQuery('');
          setSearchResults([]);
          
          // Mantener foco en el campo para escaneo continuo
          setTimeout(() => {
            productSearchInputRef.current?.focus();
          }, 100);
        } else if (results.length > 1) {
          // Múltiples resultados - mostrar en lista dropdown
          setSearchResults(results);
        } else {
          toast.error('Producto no encontrado');
          setProductSearchQuery('');
          setSearchResults([]);
        }
      } catch (error) {
        toast.error('Error al buscar producto');
        console.error('Error searching product:', error);
      }
    }
  };

  const handleAddItem = async () => {
    if (!currentItem.product || currentItem.quantity <= 0 || currentItem.unitCost <= 0) {
      toast.error('Completa todos los campos del item');
      return;
    }

    if (editingItemIndex !== null) {
      // Actualizar item existente
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = { ...currentItem };
      setFormData({ ...formData, items: updatedItems });
      setEditingItemIndex(null);
      toast.success('Producto actualizado');
    } else {
      // Agregar nuevo item
      const newItem = { ...currentItem };
      setFormData({
        ...formData,
        items: [...formData.items, newItem]
      });
      toast.success('Producto agregado');
    }
    
    setCurrentItem({ product: '', productName: '', quantity: 1, unitCost: 0, hasTax: false, taxRate: 0.16, costIncludesTax: false });
    setSelectedProduct(null);
    setDiscountInfo(null);
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
    // Si eliminamos el item que se está editando, limpiar editingItemIndex
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentItem({ product: '', productName: '', quantity: 1, unitCost: 0, hasTax: false, taxRate: 0.16, costIncludesTax: false });
      setSelectedProduct(null);
    }
  };

  const handleItemQuantityChange = (index, newQuantity) => {
    if (newQuantity <= 0) return;
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = parseInt(newQuantity);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleItemCostChange = (index, newCost) => {
    if (newCost < 0) return;
    const updatedItems = [...formData.items];
    updatedItems[index].unitCost = parseFloat(newCost);
    setFormData({ ...formData, items: updatedItems });
  };

  // Helper para actualizar el item actualmente seleccionado en formData.items
  const updateCurrentItemInList = (updates) => {
    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = {
        ...updatedItems[editingItemIndex],
        ...updates
      };
      setFormData({ ...formData, items: updatedItems });
    }
  };

  const handleProductChange = async (productId) => {
    let product = products.find(p => p._id === productId);
    
    // Si no se encuentra en el array local, buscarlo por ID
    if (!product && productId) {
      try {
        const productRes = await productsAPI.getById(productId);
        if (productRes.data.data) {
          product = productRes.data.data;
        }
      } catch (error) {
        console.error('Error al buscar producto por ID:', error);
      }
    }
    
    // Guardar el producto seleccionado para el Autocomplete
    setSelectedProduct(product);
    
    let unitCost = product?.cost || 0;
    
    // Buscar si este producto ya existe en formData.items
    const existingItemIndex = formData.items.findIndex(item => item.product === productId);
    
    if (existingItemIndex !== -1) {
      // Si ya existe, cargar sus valores en currentItem y establecer editingItemIndex
      const existingItem = formData.items[existingItemIndex];
      setEditingItemIndex(existingItemIndex);
      setCurrentItem({
        product: productId,
        productName: product?.name || '',
        quantity: existingItem.quantity,
        unitCost: existingItem.unitCost,
        hasTax: existingItem.hasTax,
        taxRate: existingItem.taxRate,
        costIncludesTax: existingItem.costIncludesTax
      });
      return;
    } else {
      // Si no existe, limpiar editingItemIndex
      setEditingItemIndex(null);
    }
    
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
          unitCost = supplierProduct.baseCost;
        } else {
          setDiscountInfo(null);
        }
      } catch (error) {
        console.error('Error al buscar descuentos:', error);
        setDiscountInfo(null);
      }
    }
    
    // Actualizar currentItem en una sola operación
    setCurrentItem({
      product: productId,
      productName: product?.name || '',
      quantity: currentItem.quantity || 1,
      unitCost: unitCost,
      hasTax: currentItem.hasTax !== undefined ? currentItem.hasTax : false,
      taxRate: currentItem.taxRate || 0.16,
      costIncludesTax: currentItem.costIncludesTax || false
    });
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
      
      // Agregar fecha personalizada si se seleccionó
      const dataToSend = { ...formData };
      if (formData.date) {
        dataToSend.date = formData.date;
      }
      
      let response;
      if (isEditMode) {
        response = await purchasesAPI.update(selectedPurchase._id, dataToSend);
      } else {
        response = await purchasesAPI.create(dataToSend);
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
        ivaRate: 0.16,
        date: ''
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
    
    // Procesar items para asegurar que tengan productName
    const processedItems = (purchase.items || []).map(item => ({
      ...item,
      productName: item.productName || item.product?.name || 'Producto no disponible',
      hasTax: item.hasTax !== undefined ? item.hasTax : true,
      taxRate: item.taxRate !== undefined ? item.taxRate : 0.16
    }));
    
    // Cargar datos de la compra en el formulario
    const purchaseDate = purchase.date ? new Date(purchase.date) : null;
    const formattedDate = purchaseDate && !isNaN(purchaseDate.getTime()) 
      ? `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}-${String(purchaseDate.getDate()).padStart(2, '0')}` 
      : '';
    
    setFormData({
      proveedor: purchase.proveedor?._id || '',
      type: purchase.type || 'contado',
      paymentMethod: purchase.paymentMethod || 'efectivo',
      user: purchase.user || 'default_user',
      items: processedItems,
      notes: purchase.notes || '',
      invoice: purchase.invoice || '',
      receiptNumber: purchase.receiptNumber || '',
      hasIVA: purchase.hasIVA || false,
      ivaRate: purchase.ivaRate || 0.16,
      date: formattedDate
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
    return formData.items.reduce((sum, item) => {
      let base;
      if (item.costIncludesTax && item.hasTax) {
        base = item.unitCost / (1 + (item.taxRate || 0.16));
      } else {
        base = item.unitCost;
      }
      return sum + (item.quantity * base);
    }, 0);
  };

  const calculateTotalIVA = () => {
    return formData.items.reduce((sum, item) => {
      if (!item.hasTax) return sum;
      
      let base;
      if (item.costIncludesTax) {
        base = item.unitCost / (1 + (item.taxRate || 0.16));
      } else {
        base = item.unitCost;
      }
      
      const subtotal = item.quantity * base;
      const itemTax = subtotal * (item.taxRate || 0.16);
      return sum + itemTax;
    }, 0);
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

  const handleCancelPurchase = async (purchaseId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta compra?\n\nEsto revertirá el stock al inventario y, si es una compra a crédito, cancelará la cuenta por pagar asociada.')) {
      return;
    }

    try {
      await purchasesAPI.delete(purchaseId);
      toast.success('Compra cancelada correctamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cancelar compra');
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSupplier = selectedSupplier ? purchase.proveedor?._id === selectedSupplier : true;
    const matchesSearch = searchTerm === '' || 
      purchase.proveedor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.invoice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSupplier && matchesSearch;
  });

  if (loading) {
    return <SkeletonTable rows={5} columns={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-burgundy">Compras</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las compras a proveedores con descuentos por pronto pago
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary btn-md hover:shadow-sm transition-shadow duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Compra
        </button>
      </div>

      {/* Filters */}
      <div className="card hover:shadow-md transition-shadow duration-200">
        <div className="card-body p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="form-label">Filtrar por proveedor</label>
              <Autocomplete
                placeholder="Todos los proveedores"
                fetchOptions={fetchSuppliersForAutocomplete}
                displayValue={(item) => item.name}
                getOptionValue={(item) => item._id}
                value={suppliers.find(s => s._id === selectedSupplier) || null}
                onChange={(value) => setSelectedSupplier(value)}
                minLength={1}
              />
            </div>
            <div>
              <label className="form-label">Buscar compras</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Proveedor, factura, notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div>
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
      <div className="card hover:shadow-md transition-shadow duration-200 flex flex-col max-h-[calc(100vh-320px)]">
        <div className="table-container flex-1 overflow-auto">
          <table className="table table-fixed w-full">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[8%]">Fecha</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[16%]">Proveedor</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[9%]">Folio</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[20%]">Productos</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[7%]">Subtotal</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[6%]">IVA</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[6%]">Descuento</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[10%]">Total</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[6%]">Tipo</th>
                <th className="text-sm font-semibold text-gray-700 py-3 w-[6%]">Estado</th>
                {user?.role === 'admin' && <th className="text-sm font-semibold text-gray-700 py-3 w-[6%]">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase, index) => (
                <tr key={purchase._id} className={`table-row-divider ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-100`}>
                  <td className="py-5">{new Date(purchase.date).toLocaleDateString()}</td>
                  <td className="py-5">
                    <span className="truncate block" title={purchase.proveedor?.name}>{purchase.proveedor?.name}</span>
                  </td>
                  <td className="py-5">
                    <span className="truncate block" title={purchase.invoice || '-'}>{purchase.invoice || '-'}</span>
                  </td>
                  <td className="py-5">
                    {purchase.items?.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="truncate block" title={item.productName || item.product?.name || 'Producto no disponible'}>{item.productName || item.product?.name || 'Producto no disponible'}</span> x {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="py-5">{formatCurrency(purchase.baseTotal || purchase.total)}</td>
                  <td className={`py-5 ${purchase.totalIVA > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {formatCurrency(purchase.totalIVA || 0)}
                  </td>
                  <td className="py-5 text-green-600">
                    {purchase.totalDiscount > 0 ? formatCurrency(purchase.totalDiscount) : '-'}
                  </td>
                  <td className="py-5 font-bold text-gray-900">
                    {formatCurrency(purchase.total)}
                  </td>
                  <td className="py-5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      purchase.type === 'contado' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {purchase.type}
                    </span>
                  </td>
                  <td className="py-5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      purchase.status === 'pagada' ? 'bg-green-100 text-green-800' : 
                      purchase.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                      purchase.status === 'cancelada' ? 'bg-red-100 text-red-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="py-5 flex space-x-2">
                      <button
                        onClick={() => handleEditClick(purchase)}
                        disabled={purchase.status === 'cancelada'}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Editar compra"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {purchase.status !== 'cancelada' && (
                        <button
                          onClick={() => handleCancelPurchase(purchase._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Cancelar compra"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <Pagination
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
          />
        </div>
      </div>

      {/* Modal for New Purchase */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          
          <div className="relative modal-content max-w-4xl w-full max-h-[90vh] flex flex-col animate-slide-up">
            {/* Header Sticky */}
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Editar Compra' : 'Nueva Compra'}
                </h2>
                <button onClick={() => {
                  setShowModal(false);
                  setIsEditMode(false);
                  setSelectedPurchase(null);
                  resetForm();
                }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Proveedor</label>
                    <Autocomplete
                      placeholder="Buscar proveedor..."
                      fetchOptions={fetchSuppliersForAutocomplete}
                      displayValue={(item) => item.name}
                      getOptionValue={(item) => item._id}
                      value={suppliers.find(s => s._id === formData.proveedor) || null}
                      onChange={(value) => handleSupplierChange(value)}
                      required={true}
                      minLength={1}
                    />
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

                {/* Purchase Date */}
                <div>
                  <label className="form-label">Fecha de compra (opcional)</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si no seleccionas una fecha, se usará la fecha y hora actual
                  </p>
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
                              setProductSearchQuery('');
                              setSearchResults([]);
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
                      <Autocomplete
                        placeholder="Buscar producto..."
                        fetchOptions={fetchProductsForAutocomplete}
                        displayValue={(item) => `${item.name} (${item.sku || 'Sin SKU'})`}
                        getOptionValue={(item) => item._id}
                        value={selectedProduct || null}
                        onChange={(value) => handleProductChange(value)}
                        minLength={1}
                        allowDeleteClear={true}
                      />
                    </div>
                    <div>
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          setCurrentItem({...currentItem, quantity: newQuantity});
                          updateCurrentItemInList({ quantity: newQuantity });
                        }}
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
                        onChange={(e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          setCurrentItem({...currentItem, unitCost: newCost});
                          updateCurrentItemInList({ unitCost: newCost });
                        }}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">IVA</label>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          checked={currentItem.hasTax}
                          onChange={(e) => {
                            const newHasTax = e.target.checked;
                            setCurrentItem({...currentItem, hasTax: newHasTax, costIncludesTax: newHasTax ? currentItem.costIncludesTax : false});
                            updateCurrentItemInList({ hasTax: newHasTax, costIncludesTax: newHasTax ? currentItem.costIncludesTax : false });
                          }}
                          className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm">Lleva IVA</span>
                      </div>
                      {currentItem.hasTax && (
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="checkbox"
                            checked={currentItem.costIncludesTax}
                            onChange={(e) => {
                              const newCostIncludesTax = e.target.checked;
                              setCurrentItem({...currentItem, costIncludesTax: newCostIncludesTax});
                              updateCurrentItemInList({ costIncludesTax: newCostIncludesTax });
                            }}
                            className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm">IVA incluido</span>
                        </div>
                      )}
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
                            <th className="text-left py-2">IVA</th>
                            <th className="text-left py-2">Subtotal</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.productName || 'Producto no disponible'}</td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                  className="form-input w-20"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(e) => handleItemCostChange(index, e.target.value)}
                                  className="form-input w-24"
                                />
                              </td>
                              <td>
                                {!item.hasTax ? (
                                  <span className="text-gray-500 text-sm">Sin IVA</span>
                                ) : item.costIncludesTax ? (
                                  <span className="text-brand-burgundy text-sm font-medium">
                                    {((item.taxRate || 0.16) * 100).toFixed(0)}% incluido
                                  </span>
                                ) : (
                                  <span className="text-gray-700 text-sm">
                                    {((item.taxRate || 0.16) * 100).toFixed(0)}%
                                  </span>
                                )}
                              </td>
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
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(calculateBaseTotal())}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">IVA:</span>
                          <span className="font-medium">{formatCurrency(calculateTotalIVA())}</span>
                        </div>
                        {formData.type === 'credito' && calculateEarlyPaymentDiscount() > 0 && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span className="text-gray-600">Descuento pronto pago ({selectedSupplierInfo?.earlyPaymentDiscount}%):</span>
                              <span className="font-medium">-{formatCurrency(calculateEarlyPaymentDiscount())}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                              <span className="font-semibold">Total:</span>
                              <span className="font-semibold text-brand-burgundy">{formatCurrency(calculateBaseTotal() + calculateTotalIVA() - calculateEarlyPaymentDiscount())}</span>
                            </div>
                            <div className="flex justify-between text-green-600 text-xs pt-1 border-t border-green-200">
                              <span>Ahorro:</span>
                              <span className="font-medium">{formatCurrency(calculateEarlyPaymentDiscount())}</span>
                            </div>
                          </>
                        )}
                        {formData.type === 'credito' && calculateEarlyPaymentDiscount() === 0 && (
                          <>
                            <div className="flex justify-between text-gray-500 text-xs">
                              <span>Descuento pronto pago:</span>
                              <span>No disponible</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                              <span className="font-semibold">Total:</span>
                              <span className="font-semibold text-brand-burgundy">{formatCurrency(calculateBaseTotal() + calculateTotalIVA())}</span>
                            </div>
                          </>
                        )}
                        {formData.type === 'contado' && (
                          <>
                            <div className="flex justify-between text-gray-500 text-xs">
                              <span>Descuento pronto pago:</span>
                              <span>No aplica en contado</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                              <span className="font-semibold">Total:</span>
                              <span className="font-semibold text-brand-burgundy">{formatCurrency(calculateBaseTotal() + calculateTotalIVA())}</span>
                            </div>
                          </>
                        )}
                      </div>
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
              </form>
            </div>
            
            {/* Footer Sticky */}
            <div className="sticky bottom-0 bg-white p-6 border-t border-gray-200 rounded-b-xl">
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
                  onClick={(e) => {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }}
                  className="btn btn-primary btn-md"
                >
                  Crear Compra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

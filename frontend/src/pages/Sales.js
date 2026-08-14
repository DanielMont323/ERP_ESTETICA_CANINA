import React, { useState, useEffect, useCallback, useRef } from 'react';
import { salesAPI, productsAPI, servicesAPI, customersAPI, petsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import {
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  Trash2,
  PlusCircle,
  MinusCircle,
  Edit,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Vacío por defecto para mostrar todas
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    useRange: false
  });
  
  const [cart, setCart] = useState([]);
  const [editCart, setEditCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [editPet, setEditPet] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [editPaymentMethod, setEditPaymentMethod] = useState('efectivo');
  const [saleChannel, setSaleChannel] = useState('local');
  const [editSaleChannel, setEditSaleChannel] = useState('local');
  const [customCommission, setCustomCommission] = useState('');
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [notes, setNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const userRole = user?.role || 'user';
  
  // Campos manuales para Mercado Libre (solo ADMIN)
  const [manualSubtotal, setManualSubtotal] = useState('');
  const [manualTotal, setManualTotal] = useState('');
  const [manualNetIncome, setManualNetIncome] = useState('');
  const [useManualFinancials, setUseManualFinancials] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      let params = {};
      if (dateRange.useRange) {
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;
      } else {
        params.date = selectedDate;
      }
      const response = await salesAPI.getAll(params);
      setSales(response.data.data);
    } catch (error) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateRange]);

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchServices();
    fetchCustomers();
  }, [selectedDate, dateRange.useRange, dateRange.startDate, dateRange.endDate, fetchSales]);

  // Atajo ESC para cerrar modales
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
        }
        if (showEditModal) {
          setShowEditModal(false);
          setEditingSale(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showEditModal]);

  // Listener para evento personalizado de F1
  useEffect(() => {
    const handleOpenSaleModal = () => {
      setShowModal(true);
    };

    window.addEventListener('openSaleModal', handleOpenSaleModal);
    return () => window.removeEventListener('openSaleModal', handleOpenSaleModal);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ active: true });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll({ active: true });
      setServices(response.data.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ active: true });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPetsByCustomer = useCallback(async (customerId) => {
    if (!customerId) {
      setPets([]);
      setSelectedPet('');
      return;
    }
    try {
      const response = await petsAPI.getByOwner(customerId);
      setPets(response.data.data);
      setSelectedPet('');
    } catch (error) {
      console.error('Error fetching pets:', error);
      setPets([]);
    }
  }, []);

  // Cargar mascotas cuando cambia el cliente seleccionado
  useEffect(() => {
    fetchPetsByCustomer(selectedCustomer);
  }, [selectedCustomer, fetchPetsByCustomer]);

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
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!productSearchQuery.trim()) return;

      try {
        const response = await productsAPI.search(productSearchQuery);
        const results = response.data.data;

        if (results.length === 1) {
          // Producto único encontrado - agregar automáticamente
          const product = results[0];
          addToCart(product, 'producto');
          setProductSearchQuery('');
          setSearchResults([]);
          toast.success(`${product.name} agregado al carrito`);
          
          // Mantener foco en el campo para escaneo continuo
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        } else if (results.length === 0) {
          toast.error('Producto no encontrado');
        }
        // Si hay múltiples resultados, mostrarlos en la lista
      } catch (error) {
        toast.error('Error al buscar producto');
      }
    }
  };

  const addToCart = (item, type) => {
    const existingItem = cart.find(cartItem => 
      cartItem.item === item._id && cartItem.type === type
    );

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.item === item._id && cartItem.type === type
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        item: item._id,
        type,
        quantity: 1,
        unitPrice: item.price,
        name: item.name
      }]);
    }
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleEditSale = async (sale) => {
    try {
      setEditingSale(sale);
      
      // Cargar datos de la venta en el formulario de edición
      setEditCart(sale.items.map(item => ({
        item: item.item._id || item.item,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        name: item.item?.name || 'Producto'
      })));
      
      setEditCustomer(sale.customer?._id || sale.customer || '');
      setEditPet(sale.mascota?._id || sale.mascota || '');
      setEditPaymentMethod(sale.paymentMethod || 'efectivo');
      setEditSaleChannel(sale.saleChannel || 'local');
      setEditNotes(sale.notes || '');
      setEditAmountReceived(sale.amountReceived?.toString() || '');
      
      // Cargar mascotas del cliente si existe
      if (sale.customer) {
        await fetchPetsByCustomer(sale.customer._id || sale.customer);
      }
      
      setShowEditModal(true);
    } catch (error) {
      console.error('Error al cargar venta para editar:', error);
      toast.error('Error al cargar venta para editar');
    }
  };

  const handleCancelSale = async (sale) => {
    if (!window.confirm(`¿Estás seguro de cancelar la venta por $${sale.total.toFixed(2)}?`)) {
      return;
    }

    try {
      await salesAPI.cancel(sale._id);
      toast.success('Venta cancelada correctamente');
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cancelar venta');
    }
  };

  const handleSaveEdit = async () => {
    if (editCart.length === 0) {
      toast.error('La venta debe tener al menos un item');
      return;
    }

    try {
      const updateData = {
        items: editCart,
        customer: editCustomer || null,
        mascota: editPet || null,
        paymentMethod: editPaymentMethod,
        saleChannel: editSaleChannel,
        notes: editNotes
      };

      if (editPaymentMethod === 'efectivo' && editAmountReceived) {
        updateData.amountReceived = parseFloat(editAmountReceived);
      }

      await salesAPI.update(editingSale._id, updateData);
      toast.success('Venta actualizada correctamente');
      setShowEditModal(false);
      setEditingSale(null);
      setEditCart([]);
      fetchSales();
    } catch (error) {
      console.error('Error al actualizar venta:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar venta');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingSale(null);
    setEditCart([]);
    setEditCustomer('');
    setEditPet('');
    setEditPaymentMethod('efectivo');
    setEditSaleChannel('local');
    setEditNotes('');
    setEditAmountReceived('');
  };

  const addToEditCart = (item, type) => {
    const existingItem = editCart.find(cartItem => 
      cartItem.item === item._id && cartItem.type === type
    );

    if (existingItem) {
      setEditCart(editCart.map(cartItem =>
        cartItem.item === item._id && cartItem.type === type
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setEditCart([...editCart, {
        item: item._id,
        type,
        quantity: 1,
        unitPrice: item.price,
        name: item.name
      }]);
    }
  };

  const removeFromEditCart = (index) => {
    setEditCart(editCart.filter((_, i) => i !== index));
  };

  const updateEditQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromEditCart(index);
    } else {
      setEditCart(editCart.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(cart.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const calculateSubtotal = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre' && manualSubtotal !== '') {
      return parseFloat(manualSubtotal);
    }
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateCardCommission = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre') {
      return 0; // Mercado Libre maneja sus propias comisiones
    }
    const subtotal = calculateSubtotal();
    return paymentMethod === 'tarjeta' ? subtotal * 0.046 : 0;
  };

  const calculateCommission = () => {
    if (useCustomCommission && customCommission) {
      return parseFloat(customCommission);
    }
    return 0;
  };

  const calculateTotal = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre' && manualTotal !== '') {
      return parseFloat(manualTotal);
    }
    const subtotal = calculateSubtotal();
    const cardCommission = calculateCardCommission();
    return subtotal + cardCommission;
  };

  const calculateNetIncome = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre' && manualNetIncome !== '') {
      return parseFloat(manualNetIncome);
    }
    const subtotal = calculateSubtotal();
    const cardCommission = calculateCardCommission();
    const commission = calculateCommission();
    return subtotal - commission - cardCommission;
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error('Debes agregar al menos un producto o servicio');
      return;
    }

    // Validar monto recibido para efectivo
    if (paymentMethod === 'efectivo') {
      const total = calculateTotal();
      const received = parseFloat(amountReceived) || 0;
      if (received < total) {
        toast.error(`El monto recibido es insuficiente. Faltan $${(total - received).toFixed(2)}`);
        return;
      }
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          type: item.type,
          item: item.item,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paymentMethod,
        saleChannel,
        customer: selectedCustomer || null,
        mascota: selectedPet || null,
        notes,
        user: user?._id || null
      };

      // Agregar amountReceived solo si es efectivo
      if (paymentMethod === 'efectivo' && amountReceived) {
        saleData.amountReceived = parseFloat(amountReceived);
      }

      // Solo administradores pueden modificar la comisión
      if (userRole === 'admin' && useCustomCommission && customCommission) {
        saleData.commission = parseFloat(customCommission);
      }

      // Mercado Libre: enviar valores financieros manuales si están activos
      if (saleChannel === 'mercado_libre' && useManualFinancials && userRole === 'admin') {
        if (manualSubtotal !== '') saleData.subtotal = parseFloat(manualSubtotal);
        if (manualTotal !== '') saleData.total = parseFloat(manualTotal);
        if (manualNetIncome !== '') saleData.netIncome = parseFloat(manualNetIncome);
      }

      await salesAPI.create(saleData);
      toast.success('Venta registrada correctamente');
      
      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setSelectedPet('');
      setPets([]);
      setPaymentMethod('efectivo');
      setSaleChannel('local');
      setCustomCommission('');
      setUseCustomCommission(false);
      setNotes('');
      setAmountReceived('');
      setProductSearchQuery('');
      setSearchResults([]);
      setManualSubtotal('');
      setManualTotal('');
      setManualNetIncome('');
      setUseManualFinancials(false);
      setShowModal(false);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar venta');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const filteredSales = sales.filter(sale =>
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <SkeletonTable rows={5} columns={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ventas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Registra y gestiona tus ventas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useRange"
                checked={dateRange.useRange}
                onChange={(e) => setDateRange({ ...dateRange, useRange: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="useRange" className="text-sm font-medium text-gray-900">
                Usar rango de fechas
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {!dateRange.useRange ? (
                <div className="flex-1">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <label className="form-label">Fecha Inicial</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="form-label">Fecha Final</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      min={dateRange.startDate}
                      className="form-input"
                    />
                  </div>
                </>
              )}
              <div className="flex-1">
                <label className="form-label">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar ventas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Comisión Tarjeta</th>
                <th>Total</th>
                <th>Ingreso Neto</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale._id}>
                  <td>
                    {new Date(sale.date).toLocaleDateString('es-MX')}
                  </td>
                  <td>
                    {sale.customer ? sale.customer.name : 'Cliente general'}
                  </td>
                  <td>
                    <div className="space-y-1">
                      {sale.items.map((item, index) => (
                        <div key={index} className="text-sm">
                          {item.quantity}x {item.item.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(sale.subtotal || sale.total)}
                  </td>
                  <td className="text-right">
                    {sale.cardCommission > 0 ? formatCurrency(sale.cardCommission) : '-'}
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="text-right font-medium text-success-600">
                    {formatCurrency(sale.netIncome)}
                  </td>
                  <td>
                    <span className="capitalize">{sale.paymentMethod}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      sale.status === 'completada' ? 'success' :
                      sale.status === 'cancelada' ? 'danger' : 'warning'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {userRole === 'admin' && sale.status !== 'cancelada' && (
                        <>
                          <button
                            onClick={() => handleEditSale(sale)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar venta"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCancelSale(sale)}
                            className="text-danger-600 hover:text-danger-900"
                            title="Cancelar venta"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron ventas</p>
            </div>
          )}
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowModal(false)} />
            
            <div className="relative modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Nueva Venta</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Products and Services */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <div>
                      <label className="form-label">Cliente (opcional)</label>
                      <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Cliente general</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name} - {customer.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pet Selection */}
                    {selectedCustomer && (
                      <div>
                        <label className="form-label">Mascota (opcional)</label>
                        <select
                          value={selectedPet}
                          onChange={(e) => setSelectedPet(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Seleccionar mascota...</option>
                          {pets.map(pet => (
                            <option key={pet._id} value={pet._id}>
                              {pet.name} - {pet.breed}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Product Search */}
                    <div>
                      <label className="form-label">Buscar producto por nombre o SKU...</label>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="form-input"
                        placeholder="Escribe o escanea código de barras..."
                        autoFocus
                      />
                      {searchResults.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                          {searchResults.map(product => (
                            <div
                              key={product._id}
                              onClick={() => {
                                addToCart(product, 'producto');
                                setProductSearchQuery('');
                                setSearchResults([]);
                              }}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                            >
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                              <p className="text-sm font-medium text-primary-600">
                                {formatCurrency(product.price)} - Stock: {product.stock}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Products */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.filter(p => p.stock > 0).map(product => (
                          <div key={product._id} className="border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                                <p className="text-sm font-medium text-primary-600">
                                  {formatCurrency(product.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => addToCart(product, 'producto')}
                                className="btn btn-primary btn-sm"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Services */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Servicios</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map(service => (
                          <div key={service._id} className="border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-500">{service.duration} min</p>
                                <p className="text-sm font-medium text-primary-600">
                                  {formatCurrency(service.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => addToCart(service, 'servicio')}
                                className="btn btn-primary btn-sm"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cart */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Carrito</h4>
                      <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                        {cart.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Carrito vacío</p>
                        ) : (
                          cart.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">
                                  {formatCurrency(item.unitPrice)} c/u
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateQuantity(index, item.quantity - 1)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(index, item.quantity + 1)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeFromCart(index)}
                                  className="text-danger-600 hover:text-danger-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border border-gray-200 rounded-xl p-4 space-y-2 bg-white shadow-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                      </div>
                      {paymentMethod === 'tarjeta' && (
                        <div className="flex justify-between text-primary-600">
                          <span>Comisión por pago con tarjeta (4.6%):</span>
                          <span className="font-medium">{formatCurrency(calculateCardCommission())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span className="text-primary-600">{formatCurrency(calculateTotal())}</span>
                      </div>
                      {userRole === 'admin' && (
                        <div className="pt-2 border-t border-gray-200">
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={useCustomCommission}
                              onChange={(e) => setUseCustomCommission(e.target.checked)}
                              className="mr-2"
                            />
                            Modificar comisión manual
                          </label>
                          {useCustomCommission && (
                            <div className="mt-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={customCommission}
                                onChange={(e) => setCustomCommission(e.target.value)}
                                className="form-input"
                                placeholder="Monto de comisión"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold">
                        <span>Ingreso Neto:</span>
                        <span className="text-success-600">{formatCurrency(calculateNetIncome())}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="form-label">Método de pago</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          if (e.target.value !== 'efectivo') {
                            setAmountReceived('');
                          }
                        }}
                        className="form-input"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

                    {/* Amount Received and Change (only for cash) */}
                    {paymentMethod === 'efectivo' && (
                      <>
                        <div>
                          <label className="form-label">Pago recibido</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="form-input"
                            placeholder="Monto recibido..."
                          />
                        </div>
                        {amountReceived && parseFloat(amountReceived) >= calculateTotal() && (
                          <div className="bg-success-50 border border-success-200 rounded-xl p-3">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-success-900">Cambio:</span>
                              <span className="text-lg font-bold text-success-600">
                                {formatCurrency(parseFloat(amountReceived) - calculateTotal())}
                              </span>
                            </div>
                          </div>
                        )}
                        {amountReceived && parseFloat(amountReceived) < calculateTotal() && (
                          <div className="bg-danger-50 border border-danger-200 rounded-xl p-3">
                            <p className="text-danger-900">
                              Faltan: {formatCurrency(calculateTotal() - parseFloat(amountReceived))}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Sale Channel */}
                    <div>
                      <label className="form-label">Canal de venta</label>
                      <select
                        value={saleChannel}
                        onChange={(e) => {
                          setSaleChannel(e.target.value);
                          // Reset manual financials when changing channel
                          if (e.target.value !== 'mercado_libre') {
                            setUseManualFinancials(false);
                            setManualSubtotal('');
                            setManualTotal('');
                            setManualNetIncome('');
                          }
                        }}
                        className="form-input"
                      >
                        <option value="local">Local comercial</option>
                        <option value="mercado_libre">Mercado Libre</option>
                        <option value="redes_sociales">Redes Sociales</option>
                      </select>
                    </div>

                    {/* Mercado Libre - Manual Financials (Solo ADMIN) */}
                    {saleChannel === 'mercado_libre' && userRole === 'admin' && (
                      <div className="border border-primary-200 rounded-xl p-4 bg-primary-50">
                        <label className="flex items-center text-sm font-medium text-primary-900 mb-3">
                          <input
                            type="checkbox"
                            checked={useManualFinancials}
                            onChange={(e) => setUseManualFinancials(e.target.checked)}
                            className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          Editar valores financieros manualmente
                        </label>
                        {useManualFinancials && (
                          <div className="space-y-3">
                            <div>
                              <label className="form-label text-sm">Subtotal</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualSubtotal}
                                onChange={(e) => setManualSubtotal(e.target.value)}
                                className="form-input"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="form-label text-sm">Total</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualTotal}
                                onChange={(e) => setManualTotal(e.target.value)}
                                className="form-input"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="form-label text-sm">Ingreso Neto</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualNetIncome}
                                onChange={(e) => setManualNetIncome(e.target.value)}
                                className="form-input"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="form-label">Notas</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="form-input"
                        rows={3}
                        placeholder="Notas adicionales..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 btn btn-secondary btn-md"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubmitSale}
                        disabled={cart.length === 0}
                        className="flex-1 btn btn-primary btn-md"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Registrar Venta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={handleCloseEditModal} />
            
            <div className="relative modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Editar Venta #{editingSale._id.slice(-6)}</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Products and Services */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <div>
                      <label className="form-label">Cliente</label>
                      <select
                        value={editCustomer}
                        onChange={async (e) => {
                          setEditCustomer(e.target.value);
                          setEditPet('');
                          if (e.target.value) {
                            await fetchPetsByCustomer(e.target.value);
                          }
                        }}
                        className="form-input"
                      >
                        <option value="">Sin cliente</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pet Selection */}
                    {editCustomer && (
                      <div>
                        <label className="form-label">Mascota</label>
                        <select
                          value={editPet}
                          onChange={(e) => setEditPet(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Sin mascota</option>
                          {pets.map(pet => (
                            <option key={pet._id} value={pet._id}>
                              {pet.name} ({pet.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Products */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.filter(p => p.stock > 0).map(product => (
                          <div key={product._id} className="border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                                <p className="text-sm font-medium text-primary-600">
                                  {formatCurrency(product.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => addToEditCart(product, 'producto')}
                                className="btn btn-primary btn-sm"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Services */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Servicios</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map(service => (
                          <div key={service._id} className="border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-500">{service.duration} min</p>
                                <p className="text-sm font-medium text-primary-600">
                                  {formatCurrency(service.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => addToEditCart(service, 'servicio')}
                                className="btn btn-primary btn-sm"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Edit Cart */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Carrito</h4>
                      <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                        {editCart.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Carrito vacío</p>
                        ) : (
                          editCart.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">
                                  {formatCurrency(item.unitPrice)} c/u
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateEditQuantity(index, item.quantity - 1)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateEditQuantity(index, item.quantity + 1)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeFromEditCart(index)}
                                  className="text-danger-600 hover:text-danger-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}</span>
                      </div>
                      {editPaymentMethod === 'tarjeta' && (
                        <div className="flex justify-between text-gray-600">
                          <span>Comisión tarjeta (4.6%):</span>
                          <span>{formatCurrency(editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.046)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span>
                          {editPaymentMethod === 'tarjeta' 
                            ? formatCurrency(editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.046)
                            : formatCurrency(editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))
                          }
                        </span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="form-label">Método de pago</label>
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => {
                          setEditPaymentMethod(e.target.value);
                          if (e.target.value !== 'efectivo') {
                            setEditAmountReceived('');
                          }
                        }}
                        className="form-input"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

                    {/* Amount Received and Change (only for cash) */}
                    {editPaymentMethod === 'efectivo' && (
                      <>
                        <div>
                          <label className="form-label">Pago recibido</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmountReceived}
                            onChange={(e) => setEditAmountReceived(e.target.value)}
                            className="form-input"
                            placeholder="Monto recibido..."
                          />
                        </div>
                        {editAmountReceived && parseFloat(editAmountReceived) >= (editPaymentMethod === 'tarjeta' ? editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.046 : editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)) && (
                          <div className="bg-success-50 border border-success-200 rounded-xl p-3">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-success-900">Cambio:</span>
                              <span className="text-lg font-bold text-success-600">
                                {formatCurrency(parseFloat(editAmountReceived) - (editPaymentMethod === 'tarjeta' ? editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.046 : editCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)))}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Sale Channel */}
                    <div>
                      <label className="form-label">Canal de venta</label>
                      <select
                        value={editSaleChannel}
                        onChange={(e) => setEditSaleChannel(e.target.value)}
                        className="form-input"
                      >
                        <option value="local">Local comercial</option>
                        <option value="mercado_libre">Mercado Libre</option>
                        <option value="redes_sociales">Redes Sociales</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="form-label">Notas</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="form-input"
                        rows={3}
                        placeholder="Notas adicionales..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCloseEditModal}
                        className="flex-1 btn btn-secondary btn-md"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={editCart.length === 0}
                        className="flex-1 btn btn-primary btn-md"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Actualizar Venta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardFormNavigation } from '../hooks/useKeyboardFormNavigation';
import { salesAPI, productsAPI, servicesAPI, customersAPI, petsAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import Autocomplete from '../components/Autocomplete';
import {
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  Trash2,
  PlusCircle,
  MinusCircle,
  Edit,
  X,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [selectedPet, setSelectedPet] = useState('');
  const [editPet, setEditPet] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSearchResults, setEditSearchResults] = useState([]);
  const [editSelectedSearchIndex, setEditSelectedSearchIndex] = useState(-1);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [editPaymentMethod, setEditPaymentMethod] = useState('efectivo');
  const [payments, setPayments] = useState([{ method: 'efectivo', amount: 0 }]);
  const [editPayments, setEditPayments] = useState([{ method: 'efectivo', amount: 0 }]);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);
  const [editEmployeeDiscountApplied, setEditEmployeeDiscountApplied] = useState(false);
  const [saleChannel, setSaleChannel] = useState('local');
  const [expandedSale, setExpandedSale] = useState(null); // Para expandir detalles en móvil
  const [editSaleChannel, setEditSaleChannel] = useState('local');
  const [customCommission, setCustomCommission] = useState('');
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [notes, setNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const searchInputRef = useRef(null);
  const formRef = useRef(null);
  const userRole = user?.role || 'user';

  // Listener para evento personalizado de F5 contextual (nueva venta)
  useEffect(() => {
    const handleOpenNewSale = () => {
      setShowModal(true);
      // Colocar foco en el campo de búsqueda de producto después de que el modal se abra
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('openNewSale', handleOpenNewSale);
    return () => window.removeEventListener('openNewSale', handleOpenNewSale);
  }, []);

  // Navegación por teclado en formulario
  useKeyboardFormNavigation(formRef, showModal);
  
  // Campos manuales para Mercado Libre (solo ADMIN)
  const [manualSubtotal, setManualSubtotal] = useState('');
  const [manualTotal, setManualTotal] = useState('');
  const [manualNetIncome, setManualNetIncome] = useState('');
  const [useManualFinancials, setUseManualFinancials] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      let params = {
        page: pagination.page,
        limit: pagination.limit,
        status: 'completada'
      };
      if (dateRange.useRange) {
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;
      } else {
        params.date = selectedDate;
      }
      if (selectedSeller) params.userId = selectedSeller;
      const response = await salesAPI.getAll(params);
      setSales(response.data.data);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateRange, pagination.page, pagination.limit, selectedSeller]);

  useEffect(() => {
    fetchSales();
  }, [selectedDate, dateRange.useRange, dateRange.startDate, dateRange.endDate, fetchSales]);

  useEffect(() => {
    fetchProducts();
    fetchServices();
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getUsers();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

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
      const response = await servicesAPI.getAll({ active: true, limit: 1000 });
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

  // Fetch functions for autocomplete
  const fetchCustomersForAutocomplete = async (searchQuery) => {
    try {
      const response = await customersAPI.getAll({ search: searchQuery, active: true, limit: 1000 });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      return [];
    }
  };

  const fetchProductsForAutocomplete = async (searchQuery) => {
    try {
      const response = await productsAPI.search(searchQuery);
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar productos:', error);
      return [];
    }
  };

  const fetchServicesForAutocomplete = async (searchQuery) => {
    try {
      const response = await servicesAPI.getAll({ search: searchQuery, active: true, limit: 1000 });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar servicios:', error);
      return [];
    }
  };

  const fetchPetsForAutocomplete = async (searchQuery) => {
    try {
      const response = await petsAPI.getAll({ search: searchQuery, owner: selectedCustomer?._id, active: true, limit: 1000 });
      return response.data.data;
    } catch (error) {
      console.error('Error al buscar mascotas:', error);
      return [];
    }
  };

  const handleSellerChange = (sellerId) => {
    setSelectedSeller(sellerId);
    setPagination({ ...pagination, page: 1 }); // Reset a página 1 al cambiar vendedor
  };

  const fetchPetsByCustomer = useCallback(async (customerId) => {
    if (!customerId) {
      setPets([]);
      setSelectedPet('');
      return;
    }
    try {
      const response = await petsAPI.getByOwner(customerId, { limit: 1000 });
      setPets(response.data.data);
      setSelectedPet('');
    } catch (error) {
      console.error('Error fetching pets:', error);
      setPets([]);
    }
  }, []);

  // Cargar mascotas cuando cambia el cliente seleccionado
  useEffect(() => {
    fetchPetsByCustomer(selectedCustomer?._id);
    
    // Limpiar mascotas seleccionadas en el carrito cuando cambia el cliente
    if (cart.length > 0) {
      setCart(cart.map(item => ({
        ...item,
        mascota: ''
      })));
    }
  }, [selectedCustomer, fetchPetsByCustomer]);

  // Búsqueda unificada de productos y servicios con debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        try {
          // Buscar productos
          const productsResponse = await productsAPI.search(searchQuery);
          const products = productsResponse.data.data.map(p => ({ ...p, type: 'producto' }));
          
          // Buscar servicios
          const servicesResponse = await servicesAPI.getAll({ search: searchQuery, active: true, limit: 1000 });
          const services = servicesResponse.data.data.map(s => ({ ...s, type: 'servicio' }));
          
          // Combinar resultados
          const combinedResults = [...products, ...services];
          setSearchResults(combinedResults);
          setSelectedSearchIndex(-1);
        } catch (error) {
          console.error('Error searching:', error);
          setSearchResults([]);
          setSelectedSearchIndex(-1);
        }
      } else {
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Búsqueda unificada de productos y servicios en edición con debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (editSearchQuery.trim()) {
        try {
          // Buscar productos
          const productsResponse = await productsAPI.search(editSearchQuery);
          const products = productsResponse.data.data.map(p => ({ ...p, type: 'producto' }));
          
          // Buscar servicios
          const servicesResponse = await servicesAPI.getAll({ search: editSearchQuery, active: true, limit: 1000 });
          const services = servicesResponse.data.data.map(s => ({ ...s, type: 'servicio' }));
          
          // Combinar resultados
          const combinedResults = [...products, ...services];
          setEditSearchResults(combinedResults);
          setEditSelectedSearchIndex(-1);
        } catch (error) {
          console.error('Error searching in edit:', error);
          setEditSearchResults([]);
          setEditSelectedSearchIndex(-1);
        }
      } else {
        setEditSearchResults([]);
        setEditSelectedSearchIndex(-1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [editSearchQuery]);

  // Manejo de teclas para navegación por teclado en buscador
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedSearchIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      setSearchQuery('');
      searchInputRef.current?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (selectedSearchIndex >= 0 && searchResults[selectedSearchIndex]) {
        // Hay un resultado seleccionado - agregarlo al carrito
        const item = searchResults[selectedSearchIndex];
        addToCart(item, item.type);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchIndex(-1);
        toast.success(`${item.name} agregado al carrito`);
        
        // Mantener foco en el campo para escaneo continuo
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else if (searchQuery.trim()) {
        // No hay selección - comportamiento original de lector de código de barras
        try {
          const response = await productsAPI.search(searchQuery);
          const results = response.data.data;

          if (results.length === 1) {
            // Producto único encontrado - agregar automáticamente
            const product = results[0];
            addToCart(product, 'producto');
            setSearchQuery('');
            setSearchResults([]);
            setSelectedSearchIndex(-1);
            toast.success(`${product.name} agregado al carrito`);
            
            // Mantener foco en el campo para escaneo continuo
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 100);
          } else if (results.length === 0) {
            toast.error('Producto no encontrado');
          } else if (results.length > 1) {
            // Múltiples resultados - seleccionar el primero automáticamente
            setSelectedSearchIndex(0);
          }
        } catch (error) {
          toast.error('Error al buscar producto');
        }
      }
    }
  };

  const addToCart = (item, type) => {
    const existingItem = cart.find(cartItem => 
      cartItem.item === item._id && cartItem.type === type
    );

    // Calcular precio con descuento si existe
    const discountPercentage = Number(item.discountPercentage) || 0;
    const finalPrice = discountPercentage > 0
      ? Math.round((Number(item.price) * (1 - discountPercentage / 100)) * 100) / 100
      : Number(item.price);

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
        unitPrice: Number(item.price), // Precio original sin descuento
        name: item.name,
        category: item.category,
        nextDoseDate: '',
        diasProximaDosis: '',
        mascota: '',
        aplicaciones: [],
        // Campos de descuento por item
        discountType: 'ninguno',
        discountValue: 0,
        discountAmount: 0,
        subtotalBeforeDiscount: Number(item.price),
        subtotalAfterDiscount: Number(item.price)
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
        name: item.item?.name || 'Producto',
        // Campos de descuento
        discountType: item.discountType || 'ninguno',
        discountValue: item.discountValue || 0,
        discountAmount: item.discountAmount || 0,
        subtotalBeforeDiscount: item.subtotalBeforeDiscount || (item.quantity * item.unitPrice),
        subtotalAfterDiscount: item.subtotalAfterDiscount || (item.quantity * item.unitPrice)
      })));
      
      setEditCustomer(sale.customer || null);
      setEditPet(sale.mascota?._id || sale.mascota || '');
      setEditPaymentMethod(sale.paymentMethod || 'efectivo');
      setEditSaleChannel(sale.saleChannel || 'local');
      setEditNotes(sale.notes || '');
      setEditAmountReceived(sale.amountReceived?.toString() || '');
      setEditEmployeeDiscountApplied(sale.employeeDiscountApplied || false);
      
      // Cargar pagos divididos si existen
      if (sale.payments && sale.payments.length > 0) {
        setEditPayments(sale.payments.map(p => ({
          method: p.method,
          amount: p.amount
        })));
      } else {
        // Compatibilidad con ventas antiguas
        setEditPayments([{ method: sale.paymentMethod || 'efectivo', amount: sale.total || 0 }]);
      }
      
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

    // Validar pagos
    const totalPayments = editPayments.reduce((sum, p) => sum + p.amount, 0);
    const subtotal = editCart.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || (item.quantity * item.unitPrice)), 0);
    const totalDiscount = editEmployeeDiscountApplied 
      ? Math.round((subtotal * 0.20) * 100) / 100
      : editCart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const total = subtotal - totalDiscount;
    const tolerance = 0.01;
    
    if (Math.abs(totalPayments - total) > tolerance) {
      toast.error(`La suma de pagos ($${totalPayments.toFixed(2)}) no coincide con el total ($${total.toFixed(2)})`);
      return;
    }

    try {
      const updateData = {
        items: editCart.map(item => ({
          type: item.type,
          item: item.item,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType || 'ninguno',
          discountValue: item.discountValue || 0,
          discountAmount: item.discountAmount || 0,
          subtotalBeforeDiscount: item.subtotalBeforeDiscount || (item.quantity * item.unitPrice),
          subtotalAfterDiscount: item.subtotalAfterDiscount || (item.quantity * item.unitPrice),
          nextDoseDate: item.nextDoseDate || null,
          diasProximaDosis: item.diasProximaDosis ? parseInt(item.diasProximaDosis) : null,
          mascota: item.mascota || null,
          aplicaciones: item.aplicaciones && item.aplicaciones.length > 0 ? item.aplicaciones : null
        })),
        payments: editPayments,
        employeeDiscountApplied: editEmployeeDiscountApplied,
        employeeDiscountPercentage: editEmployeeDiscountApplied ? 20 : 0,
        customer: editCustomer?._id || null,
        mascota: editPet || null,
        saleChannel: editSaleChannel,
        notes: editNotes
      };

      await salesAPI.update(editingSale._id, updateData);
      toast.success('Venta actualizada correctamente');
      setShowEditModal(false);
      setEditingSale(null);
      setEditCart([]);
      setEditPayments([{ method: 'efectivo', amount: 0 }]);
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
    setEditCustomer(null);
    setEditPet('');
    setEditPaymentMethod('efectivo');
    setEditSaleChannel('local');
    setEditNotes('');
    setEditAmountReceived('');
    setEditSearchQuery('');
    setEditSearchResults([]);
    setEditSelectedSearchIndex(-1);
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

  const updateEditItemDiscount = (index, field, value) => {
    if (editEmployeeDiscountApplied) {
      toast.error('No puedes aplicar descuentos individuales mientras está activo el descuento de empleado del 20%');
      return;
    }
    
    setEditCart(editCart.map((item, i) => {
      if (i === index) {
        const newItem = { ...item };
        
        if (field === 'discountType') {
          newItem.discountType = value;
          if (value === 'ninguno') {
            newItem.discountValue = 0;
            newItem.discountAmount = 0;
          }
        } else if (field === 'discountValue') {
          newItem.discountValue = parseFloat(value) || 0;
        }
        
        const subtotalBeforeDiscount = item.quantity * item.unitPrice;
        newItem.subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;
        
        if (newItem.discountType === 'porcentaje') {
          const percentage = Math.min(Math.max(newItem.discountValue, 0), 100);
          newItem.discountAmount = Math.round((subtotalBeforeDiscount * (percentage / 100)) * 100) / 100;
        } else if (newItem.discountType === 'monto') {
          const discountAmount = Math.min(newItem.discountValue, subtotalBeforeDiscount);
          newItem.discountAmount = Math.round(discountAmount * 100) / 100;
        } else {
          newItem.discountAmount = 0;
        }
        
        newItem.subtotalAfterDiscount = Math.round((subtotalBeforeDiscount - newItem.discountAmount) * 100) / 100;
        return newItem;
      }
      return item;
    }));
  };

  const addEditPayment = () => {
    if (editPayments.length < 3) {
      // Obtener métodos ya seleccionados
      const selectedMethods = editPayments.map(p => p.method);
      const allMethods = ['efectivo', 'tarjeta', 'transferencia'];
      // Encontrar el primer método disponible
      const availableMethod = allMethods.find(method => !selectedMethods.includes(method)) || 'efectivo';
      setEditPayments([...editPayments, { method: availableMethod, amount: 0 }]);
    } else {
      toast.error('Máximo 3 métodos de pago permitidos');
    }
  };

  const removeEditPayment = (index) => {
    if (editPayments.length > 1) {
      setEditPayments(editPayments.filter((_, i) => i !== index));
    }
  };

  const updateEditPayment = (index, field, value) => {
    setEditPayments(editPayments.map((payment, i) => {
      if (i === index) {
        if (field === 'method') {
          return { ...payment, method: value };
        } else if (field === 'amount') {
          return { ...payment, amount: parseFloat(value) || 0 };
        }
      }
      return payment;
    }));
  };

  // Obtener métodos de pago disponibles para edición (excluyendo los ya seleccionados en otros pagos)
  const getAvailableEditPaymentMethods = (currentIndex) => {
    const selectedMethods = editPayments
      .map((p, i) => i !== currentIndex ? p.method : null)
      .filter(m => m !== null);
    const allMethods = ['efectivo', 'tarjeta', 'transferencia'];
    // Si solo hay 1 pago, mostrar todos los métodos
    if (editPayments.length === 1) {
      return allMethods;
    }
    return allMethods.filter(method => !selectedMethods.includes(method));
  };

  const handleEditEmployeeDiscountToggle = (checked) => {
    if (checked) {
      // Activar descuento de empleado: eliminar todos los descuentos individuales
      const updatedCart = editCart.map(item => ({
        ...item,
        discountType: 'ninguno',
        discountValue: 0,
        discountAmount: 0,
        subtotalBeforeDiscount: item.quantity * item.unitPrice,
        subtotalAfterDiscount: item.quantity * item.unitPrice
      }));
      setEditCart(updatedCart);
      setEditEmployeeDiscountApplied(true);
    } else {
      // Desactivar descuento de empleado
      setEditEmployeeDiscountApplied(false);
    }
  };

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(cart.map((item, i) => {
        if (i === index) {
          const newItem = { ...item, quantity };
          // Recalcular descuento
          const subtotalBeforeDiscount = quantity * item.unitPrice;
          newItem.subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;
          
          if (item.discountType === 'porcentaje') {
            newItem.discountAmount = Math.round((subtotalBeforeDiscount * (item.discountValue / 100)) * 100) / 100;
          } else if (item.discountType === 'monto') {
            newItem.discountAmount = Math.round(Math.min(item.discountValue, subtotalBeforeDiscount) * 100) / 100;
          } else {
            newItem.discountAmount = 0;
          }
          
          newItem.subtotalAfterDiscount = Math.round((subtotalBeforeDiscount - newItem.discountAmount) * 100) / 100;
          return newItem;
        }
        return item;
      }));
    }
  };

  const updateItemDiscount = (index, field, value) => {
    if (employeeDiscountApplied) {
      toast.error('No puedes aplicar descuentos individuales mientras está activo el descuento de empleado del 20%');
      return;
    }
    
    setCart(cart.map((item, i) => {
      if (i === index) {
        const newItem = { ...item };
        
        if (field === 'discountType') {
          newItem.discountType = value;
          // Limpiar valor anterior si cambia de tipo
          if (value === 'ninguno') {
            newItem.discountValue = 0;
            newItem.discountAmount = 0;
          }
        } else if (field === 'discountValue') {
          newItem.discountValue = parseFloat(value) || 0;
        }
        
        // Recalcular descuento
        const subtotalBeforeDiscount = item.quantity * item.unitPrice;
        newItem.subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;
        
        if (newItem.discountType === 'porcentaje') {
          const percentage = Math.min(Math.max(newItem.discountValue, 0), 100);
          newItem.discountAmount = Math.round((subtotalBeforeDiscount * (percentage / 100)) * 100) / 100;
        } else if (newItem.discountType === 'monto') {
          const discountAmount = Math.min(newItem.discountValue, subtotalBeforeDiscount);
          newItem.discountAmount = Math.round(discountAmount * 100) / 100;
        } else {
          newItem.discountAmount = 0;
        }
        
        newItem.subtotalAfterDiscount = Math.round((subtotalBeforeDiscount - newItem.discountAmount) * 100) / 100;
        return newItem;
      }
      return item;
    }));
  };

  const handleEmployeeDiscountToggle = (checked) => {
    if (checked) {
      // Activar descuento de empleado: eliminar todos los descuentos individuales
      const updatedCart = cart.map(item => ({
        ...item,
        discountType: 'ninguno',
        discountValue: 0,
        discountAmount: 0,
        subtotalBeforeDiscount: item.quantity * item.unitPrice,
        subtotalAfterDiscount: item.quantity * item.unitPrice
      }));
      setCart(updatedCart);
      setEmployeeDiscountApplied(true);
    } else {
      // Desactivar descuento de empleado
      setEmployeeDiscountApplied(false);
    }
  };

  const addPayment = () => {
    if (payments.length < 3) {
      // Obtener métodos ya seleccionados
      const selectedMethods = payments.map(p => p.method);
      const allMethods = ['efectivo', 'tarjeta', 'transferencia'];
      // Encontrar el primer método disponible
      const availableMethod = allMethods.find(method => !selectedMethods.includes(method)) || 'efectivo';
      setPayments([...payments, { method: availableMethod, amount: 0 }]);
    } else {
      toast.error('Máximo 3 métodos de pago permitidos');
    }
  };

  const removePayment = (index) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index, field, value) => {
    setPayments(payments.map((payment, i) => {
      if (i === index) {
        if (field === 'method') {
          return { ...payment, method: value };
        } else if (field === 'amount') {
          return { ...payment, amount: parseFloat(value) || 0 };
        }
      }
      return payment;
    }));
  };

  // Obtener métodos de pago disponibles (excluyendo los ya seleccionados en otros pagos)
  const getAvailablePaymentMethods = (currentIndex) => {
    const selectedMethods = payments
      .map((p, i) => i !== currentIndex ? p.method : null)
      .filter(m => m !== null);
    const allMethods = ['efectivo', 'tarjeta', 'transferencia'];
    // Si solo hay 1 pago, mostrar todos los métodos
    if (payments.length === 1) {
      return allMethods;
    }
    return allMethods.filter(method => !selectedMethods.includes(method));
  };

  const calculateSubtotal = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre' && manualSubtotal !== '') {
      return parseFloat(manualSubtotal);
    }
    // Suma de subtotalBeforeDiscount (subtotal original sin descuentos)
    return cart.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || (item.quantity * item.unitPrice)), 0);
  };

  const calculateTotalDiscount = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre') {
      return 0;
    }
    // Si hay descuento de empleado, calcular 20% del subtotal
    if (employeeDiscountApplied) {
      const subtotal = calculateSubtotal();
      return Math.round((subtotal * 0.20) * 100) / 100;
    }
    // Suma de discountAmount de todos los items
    return cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  };

  const calculateCardCommission = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre') {
      return 0; // Mercado Libre maneja sus propias comisiones
    }
    // Calcular comisión basado en pagos con tarjeta
    const total = calculateTotal();
    const totalCardPayment = payments.reduce((sum, p) => 
      p.method === 'tarjeta' ? sum + p.amount : sum, 0
    );
    return totalCardPayment * 0.0406;
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
    const totalDiscount = calculateTotalDiscount();
    // Total = subtotal - totalDiscount
    return subtotal - totalDiscount;
  };

  const calculateNetIncome = () => {
    if (useManualFinancials && saleChannel === 'mercado_libre' && manualNetIncome !== '') {
      return parseFloat(manualNetIncome);
    }
    const total = calculateTotal();
    const cardCommission = calculateCardCommission();
    const commission = calculateCommission();
    // Ingreso neto = total - comisión vendedor - comisión tarjeta
    return total - commission - cardCommission;
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error('Debes agregar al menos un producto o servicio');
      return;
    }

    // Validar pagos
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const total = calculateTotal();
    const tolerance = 0.01;
    
    if (Math.abs(totalPayments - total) > tolerance) {
      toast.error(`La suma de pagos ($${totalPayments.toFixed(2)}) no coincide con el total ($${total.toFixed(2)})`);
      return;
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          type: item.type,
          item: item.item,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType || 'ninguno',
          discountValue: item.discountValue || 0,
          discountAmount: item.discountAmount || 0,
          subtotalBeforeDiscount: item.subtotalBeforeDiscount || (item.quantity * item.unitPrice),
          subtotalAfterDiscount: item.subtotalAfterDiscount || (item.quantity * item.unitPrice),
          nextDoseDate: item.nextDoseDate || null,
          diasProximaDosis: item.diasProximaDosis ? parseInt(item.diasProximaDosis) : null,
          mascota: item.mascota || null,
          aplicaciones: item.aplicaciones && item.aplicaciones.length > 0 ? item.aplicaciones : null
        })),
        payments: payments,
        employeeDiscountApplied,
        employeeDiscountPercentage: employeeDiscountApplied ? 20 : 0,
        saleChannel,
        customer: selectedCustomer?._id || null,
        notes,
        user: user?._id || null
      };

      // Agregar fecha personalizada si se seleccionó
      if (saleDate) {
        saleData.date = saleDate;
      }

      // Agregar valores manuales solo si es Mercado Libre
      if (saleChannel === 'mercado_libre' && useManualFinancials) {
        saleData.manualFinancials = true;
        if (manualSubtotal) saleData.subtotal = parseFloat(manualSubtotal);
        if (manualTotal) saleData.total = parseFloat(manualTotal);
        if (manualNetIncome) saleData.netIncome = parseFloat(manualNetIncome);
      }

      // Agregar comisión personalizada si existe
      if (useCustomCommission && customCommission) {
        saleData.commission = parseFloat(customCommission);
      }

      // Solo administradores pueden modificar la comisión
      if (userRole === 'admin' && useCustomCommission && customCommission) {
        saleData.commission = parseFloat(customCommission);
      }

      // Mercado Libre: enviar valores financieros manuales si están activos
      if (saleChannel === 'mercado_libre' && useManualFinancials && userRole === 'admin') {
        saleData.manualFinancials = true;
        if (manualSubtotal !== '') saleData.subtotal = parseFloat(manualSubtotal);
        if (manualTotal !== '') saleData.total = parseFloat(manualTotal);
        if (manualNetIncome !== '') saleData.netIncome = parseFloat(manualNetIncome);
      }

      await salesAPI.create(saleData);
      toast.success('Venta registrada correctamente');
      
      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setSelectedPet('');
      setPets([]);
      setPaymentMethod('efectivo');
      setSaleChannel('local');
      setCustomCommission('');
      setUseCustomCommission(false);
      setNotes('');
      setAmountReceived('');
      setSaleDate('');
      setSearchQuery('');
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text">Ventas</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-textSecondary">
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
                className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="useRange" className="text-sm font-medium text-gray-900 dark:text-dark-text">
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
                <label className="form-label">Vendedor</label>
                <Autocomplete
                  placeholder="Todos los vendedores"
                  localOptions={users}
                  displayValue={(item) => item.name}
                  getOptionValue={(item) => item._id}
                  value={users.find(u => u._id === selectedSeller) || null}
                  onChange={(value) => handleSellerChange(value)}
                  minLength={0}
                />
              </div>
              <div className="flex-1">
                <label className="form-label">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-textSecondary" />
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
      <div className="card hover:shadow-md transition-shadow duration-200 flex flex-col max-h-[calc(100vh-320px)]">
        {/* Desktop Table - Hidden on Mobile */}
        <div className="hidden md:block table-container flex-1 overflow-auto">
          <table className="table min-w-full">
            <thead className="sticky top-0 bg-gray-50 dark:bg-dark-surface z-10">
              <tr>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[100px]">Fecha</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[150px]">Cliente</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[120px]">Vendedor</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[200px]">Items</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-right min-w-[100px]">Subtotal</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-right min-w-[120px]">Comisión Tarjeta</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-right min-w-[100px]">Total</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-right min-w-[100px]">Ingreso Neto</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[80px]">Método</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-center min-w-[80px]">Desc. empleado</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-left min-w-[80px]">Estado</th>
                <th className="text-sm font-semibold text-gray-700 dark:text-dark-textSecondary py-3 px-4 text-center min-w-[80px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, index) => (
                <tr key={sale._id} className={`table-row-divider ${index % 2 === 0 ? 'bg-white dark:bg-dark-card' : 'bg-gray-50 dark:bg-dark-surface'} hover:bg-yellow-100`}>
                  <td className="py-4 px-4">
                    {new Date(sale.date).toLocaleDateString('es-MX')}
                  </td>
                  <td className="py-4 px-4">
                    {sale.customer ? sale.customer.name : 'Cliente general'}
                  </td>
                  <td className="py-4 px-4">
                    {sale.user ? sale.user.name : 'Sin vendedor registrado'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {sale.items.map((item, index) => (
                        <div key={index} className="text-sm">
                          {item.quantity}x {item.item.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(sale.subtotal || sale.total)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {sale.cardCommission > 0 ? formatCurrency(sale.cardCommission) : '-'}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-success-600">
                    {formatCurrency(sale.netIncome)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="capitalize">{sale.paymentMethod}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {sale.employeeDiscountApplied ? (
                      <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`badge badge-${
                      sale.status === 'completada' ? 'success' :
                      sale.status === 'cancelada' ? 'danger' : 'warning'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2 justify-center">
                      {userRole === 'admin' && sale.status !== 'cancelada' && (
                        <>
                          <button
                            onClick={() => handleEditSale(sale)}
                            className="text-brand-burgundy hover:text-primary-900"
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
              <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-dark-textSecondary mx-auto mb-4" />
              <p className="text-gray-500 dark:text-dark-textSecondary">No se encontraron ventas</p>
            </div>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4 p-4 overflow-auto">
          {filteredSales.map((sale, index) => (
            <div key={sale._id} className="card">
              <div className="card-body">
                {/* Card Header - Always Visible */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-dark-textSecondary">
                      {new Date(sale.date).toLocaleDateString('es-MX')}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-dark-text">
                      {sale.customer ? sale.customer.name : 'Cliente general'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-burgundy">
                      {formatCurrency(sale.total)}
                    </div>
                    {sale.employeeDiscountApplied && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Desc. empleado
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`badge badge-${
                    sale.status === 'completada' ? 'success' :
                    sale.status === 'cancelada' ? 'danger' : 'warning'
                  }`}>
                    {sale.status}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-dark-textSecondary capitalize">
                    {sale.paymentMethod}
                  </span>
                </div>

                {/* Expandable Details */}
                <button
                  onClick={() => setExpandedSale(expandedSale === sale._id ? null : sale._id)}
                  className="w-full text-center text-sm text-brand-burgundy hover:text-brand-burgundy-dark py-2 border-t border-gray-200 dark:border-dark-border"
                >
                  {expandedSale === sale._id ? 'Ocultar detalles' : 'Ver detalles'}
                </button>

                {/* Expanded Content */}
                {expandedSale === sale._id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500 dark:text-dark-textSecondary">Vendedor:</span>
                        <span className="ml-2">{sale.user ? sale.user.name : 'Sin vendedor'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-dark-textSecondary">Subtotal:</span>
                        <span className="ml-2">{formatCurrency(sale.subtotal || sale.total)}</span>
                      </div>
                    </div>

                    {sale.employeeDiscountApplied && (
                      <div className="text-green-600 dark:text-green-400">
                        Descuento empleado (20%): -{formatCurrency(sale.employeeDiscountAmount || 0)}
                      </div>
                    )}

                    {sale.cardCommission > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-dark-textSecondary">Comisión tarjeta:</span>
                        <span className="ml-2">{formatCurrency(sale.cardCommission)}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-500 dark:text-dark-textSecondary">Ingreso neto:</span>
                      <span className="ml-2 text-success-600 font-medium">{formatCurrency(sale.netIncome)}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-dark-textSecondary">Items:</span>
                      <div className="mt-1 space-y-1">
                        {sale.items.map((item, index) => (
                          <div key={index} className="text-gray-700 dark:text-dark-text">
                            {item.quantity}x {item.item.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {sale.payments && sale.payments.length > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-dark-textSecondary">Pagos:</span>
                        <div className="mt-1 space-y-1">
                          {sale.payments.map((payment, index) => (
                            <div key={index} className="text-gray-700 dark:text-dark-text">
                              {payment.method}: {formatCurrency(payment.amount)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {userRole === 'admin' && sale.status !== 'cancelada' && (
                      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-dark-border">
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="flex-1 btn btn-primary btn-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleCancelSale(sale)}
                          className="flex-1 btn btn-danger btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-dark-textSecondary mx-auto mb-4" />
              <p className="text-gray-500 dark:text-dark-textSecondary">No se encontraron ventas</p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="border-t border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-surface">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-dark-textSecondary">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} ventas
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination({ ...pagination, page: pageNum })}
                        className={`btn btn-sm ${pagination.page === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          
          <div className="relative modal-content max-w-4xl w-full max-h-[90vh] flex flex-col animate-slide-up">
            {/* Header Sticky */}
            <div className="sticky top-0 bg-white dark:bg-dark-card z-10 p-6 border-b border-gray-200 dark:border-dark-border rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Nueva Venta</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:text-dark-textSecondary transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Products and Services */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Sale Date */}
                    <div>
                      <label className="form-label">Fecha de venta (opcional)</label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="form-input"
                      />
                      <p className="text-xs text-gray-500 dark:text-dark-textSecondary mt-1">
                        Si no seleccionas una fecha, se usará la fecha y hora actual
                      </p>
                    </div>

                    {/* Customer Selection */}
                    <div>
                      <label className="form-label">Cliente (opcional)</label>
                      <Autocomplete
                        placeholder="Cliente general"
                        fetchOptions={fetchCustomersForAutocomplete}
                        displayValue={(item) => item ? `${item.name || ''} - ${item.phone || ''}` : ''}
                        getOptionValue={(item) => item._id}
                        value={selectedCustomer}
                        onChange={async (value) => {
                          if (!value) {
                            setSelectedCustomer(null);
                            return;
                          }
                          try {
                            const response = await customersAPI.getById(value);
                            setSelectedCustomer(response.data.data);
                          } catch (error) {
                            console.error('Error fetching customer:', error);
                            setSelectedCustomer(null);
                          }
                        }}
                        minLength={1}
                      />
                    </div>

                    {/* Unified Search */}
                    <div>
                      <label className="form-label">Buscar producto o servicio por nombre...</label>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="form-input"
                        placeholder="Escribe o escanea código de barras..."
                        autoFocus
                      />
                      {searchResults.length > 0 && (
                        <div className="mt-2 border border-gray-200 dark:border-dark-border rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-dark-card">
                          {searchResults.map((item, index) => (
                            <div
                              key={item._id}
                              onClick={() => {
                                addToCart(item, item.type);
                                setSearchQuery('');
                                setSearchResults([]);
                                setSelectedSearchIndex(-1);
                              }}
                              className={`p-3 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                                index === selectedSearchIndex 
                                  ? 'bg-brand-burgundy bg-opacity-10 border-l-4 border-l-brand-burgundy' 
                                  : 'hover:bg-gray-50 dark:bg-dark-surface'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  item.type === 'producto' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.type === 'producto' ? 'Producto' : 'Servicio'}
                                </span>
                                <p className="font-medium text-gray-900 dark:text-dark-text">{item.name}</p>
                              </div>
                              {item.type === 'producto' && (
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">SKU: {item.sku} - Stock: {item.stock}</p>
                              )}
                              {item.type === 'servicio' && (
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">{item.duration} min</p>
                              )}
                              <p className="text-sm font-medium text-brand-burgundy">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Products */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">Productos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.filter(p => p.stock > 0).map(product => (
                          <div key={product._id} className="border border-gray-200 dark:border-dark-border rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-text">{product.name}</p>
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">Stock: {product.stock}</p>
                                <p className="text-sm font-medium text-brand-burgundy">
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
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">Servicios</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map(service => (
                          <div key={service._id} className="border border-gray-200 dark:border-dark-border rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-text">{service.name}</p>
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">{service.duration} min</p>
                                <p className="text-sm font-medium text-brand-burgundy">
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
                      <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">Carrito</h4>
                      <div className="border border-gray-200 dark:border-dark-border rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-dark-surface">
                        {cart.length === 0 ? (
                          <p className="text-gray-500 dark:text-dark-textSecondary text-center py-4">Carrito vacío</p>
                        ) : (
                          cart.map((item, index) => {
                            let categoryLower = '';
                            if (item.category) {
                              if (typeof item.category === 'object' && item.category.name) {
                                categoryLower = item.category.name.toString().toLowerCase();
                              } else {
                                categoryLower = item.category.toString().toLowerCase();
                              }
                            }
                            
                            const isVaccine = categoryLower === 'vacunas' || categoryLower === 'vacuna';
                            const isDewormer = categoryLower === 'desparasitantes' || categoryLower === 'desparasitante' || categoryLower.includes('desparasitante');
                            const showNextDose = (isVaccine || isDewormer) && item.type === 'producto';
                            const showMascotaSelector = selectedCustomer && !isVaccine && !isDewormer;
                            const showAplicacionesSelector = (isVaccine || isDewormer) && item.type === 'producto';

                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-dark-text">{item.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                                      {formatCurrency(item.unitPrice)} c/u
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => updateQuantity(index, item.quantity - 1)}
                                      className="text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:text-dark-textSecondary"
                                    >
                                      <MinusCircle className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(index, item.quantity + 1)}
                                      className="text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:text-dark-textSecondary"
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
                                
                                {/* Descuento por item */}
                                <div className="pl-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg p-2">
                                  <div className="flex items-center space-x-2">
                                    <select
                                      value={item.discountType || 'ninguno'}
                                      onChange={(e) => updateItemDiscount(index, 'discountType', e.target.value)}
                                      className="form-input text-sm py-1 flex-1"
                                      disabled={employeeDiscountApplied}
                                    >
                                      <option value="ninguno">Sin descuento</option>
                                      <option value="porcentaje">Porcentaje</option>
                                      <option value="monto">Monto fijo</option>
                                    </select>
                                    {item.discountType !== 'ninguno' && (
                                      <input
                                        type="number"
                                        value={item.discountValue || ''}
                                        onChange={(e) => updateItemDiscount(index, 'discountValue', e.target.value)}
                                        placeholder={item.discountType === 'porcentaje' ? '%' : '$'}
                                        min="0"
                                        max={item.discountType === 'porcentaje' ? 100 : item.subtotalBeforeDiscount}
                                        className="form-input text-sm py-1 w-24"
                                        disabled={employeeDiscountApplied}
                                      />
                                    )}
                                  </div>
                                  {item.discountType !== 'ninguno' && item.discountAmount > 0 && (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                                      Descuento: -{formatCurrency(item.discountAmount)}
                                    </div>
                                  )}
                                </div>
                                {showAplicacionesSelector && (
                                  <div className="pl-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                    <label className="text-xs font-semibold text-yellow-800">⚠️ Mascota a la que se aplicará (OBLIGATORIO):</label>
                                    <div className="space-y-2 mt-2">
                                      {[...Array(item.quantity)].map((_, unitIndex) => (
                                        <div key={unitIndex} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-dark-textSecondary w-16">Unidad {unitIndex + 1}:</span>
                                          <select
                                            value={item.aplicaciones[unitIndex]?.mascota || ''}
                                            onChange={(e) => {
                                              const newCart = [...cart];
                                              if (!newCart[index].aplicaciones) {
                                                newCart[index].aplicaciones = [];
                                              }
                                              newCart[index].aplicaciones[unitIndex] = {
                                                ...newCart[index].aplicaciones[unitIndex],
                                                mascota: e.target.value,
                                                fechaAplicacion: new Date().toISOString()
                                              };
                                              setCart(newCart);
                                            }}
                                            className="form-input text-sm py-1 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 flex-1"
                                            required
                                          >
                                            <option value="">Seleccionar mascota...</option>
                                            {pets.map(pet => (
                                              <option key={pet._id} value={pet._id}>
                                                {pet.name} - {pet.breed}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ))}
                                    </div>
                                    {(!item.aplicaciones || item.aplicaciones.length === 0 || item.aplicaciones.some(a => !a.mascota)) && (
                                      <p className="text-xs text-red-600 mt-1">⚠️ Debes seleccionar una mascota para cada unidad</p>
                                    )}
                                  </div>
                                )}
                                {showMascotaSelector && (
                                  <div className="pl-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                    <label className="text-xs font-semibold text-blue-800">Mascota asociada (opcional):</label>
                                    <Autocomplete
                                      placeholder="Sin mascota"
                                      localOptions={pets}
                                      displayValue={(item) => `${item.name} - ${item.breed}`}
                              getOptionValue={(item) => item._id}
                              value={pets.find(p => p._id === item.mascota) || null}
                              onChange={(value) => {
                                const newCart = [...cart];
                                newCart[index].mascota = value;
                                setCart(newCart);
                              }}
                              minLength={0}
                              className="text-sm py-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500 mt-2"
                            />
                                  </div>
                                )}
                                {showNextDose && (
                                  <div className="pl-2">
                                    <label className="text-xs text-gray-600 dark:text-dark-textSecondary">Días para próxima dosis:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.diasProximaDosis || ''}
                                      onChange={(e) => {
                                        const newCart = [...cart];
                                        newCart[index].diasProximaDosis = e.target.value;
                                        setCart(newCart);
                                      }}
                                      className="form-input text-sm py-1"
                                      placeholder="Ej: 30"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-textSecondary mt-1">El sistema calculará la fecha automáticamente</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Employee Discount Checkbox */}
                    <div>
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={employeeDiscountApplied}
                          onChange={(e) => handleEmployeeDiscountToggle(e.target.checked)}
                          className="mr-2"
                        />
                        Descuento de empleado (20%)
                      </label>
                    </div>

                    {/* Totals */}
                    <div className="border border-gray-200 dark:border-dark-border rounded-xl p-4 space-y-2 bg-white dark:bg-dark-card shadow-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                      </div>
                      {calculateTotalDiscount() > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>{employeeDiscountApplied ? 'Descuento empleado (20%)' : 'Descuentos'}:</span>
                          <span className="font-medium">-{formatCurrency(calculateTotalDiscount())}</span>
                        </div>
                      )}
                      {calculateCardCommission() > 0 && (
                        <div className="flex justify-between text-brand-burgundy">
                          <span>Comisión por pago con tarjeta (4.06%):</span>
                          <span className="font-medium">{formatCurrency(calculateCardCommission())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-dark-border pt-2">
                        <span>Total:</span>
                        <span className="text-brand-burgundy">{formatCurrency(calculateTotal())}</span>
                      </div>
                      {userRole === 'admin' && (
                        <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
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

                    {/* Multiple Payments */}
                    <div>
                      <label className="form-label">Pagos</label>
                      <div className="space-y-2">
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <select
                              value={payment.method}
                              onChange={(e) => updatePayment(index, 'method', e.target.value)}
                              className="form-input flex-1"
                            >
                              {getAvailablePaymentMethods(index).map(method => (
                                <option key={method} value={method}>
                                  {method === 'efectivo' ? 'Efectivo' : method === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount || ''}
                              onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                              placeholder="Monto"
                              className="form-input w-32"
                            />
                            {payments.length > 1 && (
                              <button
                                onClick={() => removePayment(index)}
                                className="text-danger-600 hover:text-danger-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {payments.length < 3 && (
                          <button
                            onClick={addPayment}
                            className="text-sm text-brand-burgundy hover:text-brand-burgundy-dark flex items-center"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Agregar pago
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-dark-textSecondary">
                        Total pagos: {formatCurrency(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                      </div>
                    </div>

                    {/* Change (calculated automatically for cash payments) */}
                    {payments.some(p => p.method === 'efectivo') && (
                      <div className="bg-success-50 border border-success-200 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-success-900">Cambio:</span>
                          <span className="text-lg font-bold text-success-600">
                            {(() => {
                              const totalCash = payments.filter(p => p.method === 'efectivo').reduce((sum, p) => sum + (p.amount || 0), 0);
                              const nonCashTotal = payments.filter(p => p.method !== 'efectivo').reduce((sum, p) => sum + (p.amount || 0), 0);
                              const cashRequired = calculateTotal() - nonCashTotal;
                              const change = totalCash - cashRequired;
                              return formatCurrency(Math.max(0, change));
                            })()}
                          </span>
                        </div>
                      </div>
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
                            className="mr-2 h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
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
                  </div>
                </div>
              </div>

            {/* Footer Sticky */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-card p-6 border-t border-gray-200 dark:border-dark-border rounded-b-xl">
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
      )}

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={handleCloseEditModal} />
            
            <div className="relative modal-content max-w-4xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-6">Editar Venta #{editingSale._id.slice(-6)}</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Products and Services */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <div>
                      <label className="form-label">Cliente</label>
                      <select
                        value={editCustomer?._id || ''}
                        onChange={async (e) => {
                          const selectedCustomerObj = customers.find(c => c._id === e.target.value);
                          setEditCustomer(selectedCustomerObj || null);
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

                    {/* Unified Search for Edit */}
                    <div>
                      <label className="form-label">Buscar producto o servicio por nombre...</label>
                      <input
                        type="text"
                        value={editSearchQuery}
                        onChange={(e) => setEditSearchQuery(e.target.value)}
                        className="form-input"
                        placeholder="Escribe o escanea código de barras..."
                      />
                      {editSearchResults.length > 0 && (
                        <div className="mt-2 border border-gray-200 dark:border-dark-border rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-dark-card">
                          {editSearchResults.map((item, index) => (
                            <div
                              key={item._id}
                              onClick={() => {
                                addToEditCart(item, item.type);
                                setEditSearchQuery('');
                                setEditSearchResults([]);
                                setEditSelectedSearchIndex(-1);
                              }}
                              className="p-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:bg-dark-surface transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  item.type === 'producto' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.type === 'producto' ? 'Producto' : 'Servicio'}
                                </span>
                                <p className="font-medium text-gray-900 dark:text-dark-text">{item.name}</p>
                              </div>
                              {item.type === 'producto' && (
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">SKU: {item.sku} - Stock: {item.stock}</p>
                              )}
                              {item.type === 'servicio' && (
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">{item.duration} min</p>
                              )}
                              <p className="text-sm font-medium text-brand-burgundy">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Products */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">Productos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.filter(p => p.stock > 0).map(product => (
                          <div key={product._id} className="border border-gray-200 dark:border-dark-border rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-text">{product.name}</p>
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">Stock: {product.stock}</p>
                                <p className="text-sm font-medium text-brand-burgundy">
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
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3">Servicios</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map(service => (
                          <div key={service._id} className="border border-gray-200 dark:border-dark-border rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-text">{service.name}</p>
                                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">{service.duration} min</p>
                                <p className="text-sm font-medium text-brand-burgundy">
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
                      <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">Carrito</h4>
                      <div className="border border-gray-200 dark:border-dark-border rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-dark-surface">
                        {editCart.length === 0 ? (
                          <p className="text-gray-500 dark:text-dark-textSecondary text-center py-4">Carrito vacío</p>
                        ) : (
                          editCart.map((item, index) => {
                            let categoryLower = '';
                            if (item.category) {
                              if (typeof item.category === 'object' && item.category.name) {
                                categoryLower = item.category.name.toString().toLowerCase();
                              } else {
                                categoryLower = item.category.toString().toLowerCase();
                              }
                            }
                            
                            const isVaccine = categoryLower === 'vacunas' || categoryLower === 'vacuna';
                            const isDewormer = categoryLower === 'desparasitantes' || categoryLower === 'desparasitante' || categoryLower.includes('desparasitante');
                            const showMascotaSelector = editCustomer && !isVaccine && !isDewormer;
                            const showAplicacionesSelector = (isVaccine || isDewormer) && item.type === 'producto';

                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-dark-text">{item.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                                      {formatCurrency(item.unitPrice)} c/u
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => updateEditQuantity(index, item.quantity - 1)}
                                      className="text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:text-dark-textSecondary"
                                    >
                                      <MinusCircle className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                      onClick={() => updateEditQuantity(index, item.quantity + 1)}
                                      className="text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:text-dark-textSecondary"
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
                                
                                {/* Descuento por item en edición */}
                                <div className="pl-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg p-2">
                                  <div className="flex items-center space-x-2">
                                    <select
                                      value={item.discountType || 'ninguno'}
                                      onChange={(e) => updateEditItemDiscount(index, 'discountType', e.target.value)}
                                      className="form-input text-sm py-1 flex-1"
                                      disabled={editEmployeeDiscountApplied}
                                    >
                                      <option value="ninguno">Sin descuento</option>
                                      <option value="porcentaje">Porcentaje</option>
                                      <option value="monto">Monto fijo</option>
                                    </select>
                                    {item.discountType !== 'ninguno' && (
                                      <input
                                        type="number"
                                        value={item.discountValue || ''}
                                        onChange={(e) => updateEditItemDiscount(index, 'discountValue', e.target.value)}
                                        placeholder={item.discountType === 'porcentaje' ? '%' : '$'}
                                        min="0"
                                        max={item.discountType === 'porcentaje' ? 100 : item.subtotalBeforeDiscount}
                                        className="form-input text-sm py-1 w-24"
                                        disabled={editEmployeeDiscountApplied}
                                      />
                                    )}
                                  </div>
                                  {item.discountType !== 'ninguno' && item.discountAmount > 0 && (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                                      Descuento: -{formatCurrency(item.discountAmount)}
                                    </div>
                                  )}
                                </div>
                                {showAplicacionesSelector && (
                                  <div className="pl-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                    <label className="text-xs font-semibold text-yellow-800">⚠️ Mascota a la que se aplicará (OBLIGATORIO):</label>
                                    <div className="space-y-2 mt-2">
                                      {[...Array(item.quantity)].map((_, unitIndex) => (
                                        <div key={unitIndex} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-dark-textSecondary w-16">Unidad {unitIndex + 1}:</span>
                                          <select
                                            value={item.aplicaciones[unitIndex]?.mascota || ''}
                                            onChange={(e) => {
                                              const newCart = [...editCart];
                                              if (!newCart[index].aplicaciones) {
                                                newCart[index].aplicaciones = [];
                                              }
                                              newCart[index].aplicaciones[unitIndex] = {
                                                ...newCart[index].aplicaciones[unitIndex],
                                                mascota: e.target.value,
                                                fechaAplicacion: new Date().toISOString()
                                              };
                                              setEditCart(newCart);
                                            }}
                                            className="form-input text-sm py-1 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 flex-1"
                                            required
                                          >
                                            <option value="">Seleccionar mascota...</option>
                                            {pets.map(pet => (
                                              <option key={pet._id} value={pet._id}>
                                                {pet.name} - {pet.breed}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ))}
                                    </div>
                                    {(!item.aplicaciones || item.aplicaciones.length === 0 || item.aplicaciones.some(a => !a.mascota)) && (
                                      <p className="text-xs text-red-600 mt-1">⚠️ Debes seleccionar una mascota para cada unidad</p>
                                    )}
                                  </div>
                                )}
                                {showMascotaSelector && (
                                  <div className="pl-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                    <label className="text-xs font-semibold text-blue-800">Mascota asociada (opcional):</label>
                                    <select
                                      value={item.mascota || ''}
                                      onChange={(e) => {
                                        const newCart = [...editCart];
                                        newCart[index].mascota = e.target.value;
                                        setEditCart(newCart);
                                      }}
                                      className="form-input text-sm py-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500 mt-2"
                                    >
                                      <option value="">Sin mascota</option>
                                      {pets.length === 0 ? (
                                        <option value="" disabled>Este cliente no tiene mascotas</option>
                                      ) : (
                                        pets.map(pet => (
                                          <option key={pet._id} value={pet._id}>
                                            {pet.name} - {pet.breed}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Employee Discount Checkbox in Edit */}
                    <div>
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEmployeeDiscountApplied}
                          onChange={(e) => handleEditEmployeeDiscountToggle(e.target.checked)}
                          className="mr-2"
                        />
                        Descuento de empleado (20%)
                      </label>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-2">
                      <div className="flex justify-between text-gray-600 dark:text-dark-textSecondary">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(editCart.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || (item.quantity * item.unitPrice)), 0))}</span>
                      </div>
                      {(editCart.reduce((sum, item) => sum + (item.discountAmount || 0), 0) > 0 || editEmployeeDiscountApplied) && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>{editEmployeeDiscountApplied ? 'Descuento empleado (20%)' : 'Descuentos'}:</span>
                          <span>-{formatCurrency(editEmployeeDiscountApplied 
                            ? Math.round((editCart.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || (item.quantity * item.unitPrice)), 0) * 0.20) * 100) / 100
                            : editCart.reduce((sum, item) => sum + (item.discountAmount || 0), 0))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-dark-text pt-2 border-t border-gray-200 dark:border-dark-border">
                        <span>Total:</span>
                        <span>{formatCurrency(editEmployeeDiscountApplied
                          ? Math.round((editCart.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || (item.quantity * item.unitPrice)), 0) * 0.80) * 100) / 100
                          : editCart.reduce((sum, item) => sum + (item.subtotalAfterDiscount || (item.quantity * item.unitPrice)), 0))}</span>
                      </div>
                    </div>

                    {/* Multiple Payments in Edit */}
                    <div>
                      <label className="form-label">Pagos</label>
                      <div className="space-y-2">
                        {editPayments.map((payment, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <select
                              value={payment.method}
                              onChange={(e) => updateEditPayment(index, 'method', e.target.value)}
                              className="form-input flex-1"
                            >
                              {getAvailableEditPaymentMethods(index).map(method => (
                                <option key={method} value={method}>
                                  {method === 'efectivo' ? 'Efectivo' : method === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount || ''}
                              onChange={(e) => updateEditPayment(index, 'amount', e.target.value)}
                              placeholder="Monto"
                              className="form-input w-32"
                            />
                            {editPayments.length > 1 && (
                              <button
                                onClick={() => removeEditPayment(index)}
                                className="text-danger-600 hover:text-danger-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {editPayments.length < 3 && (
                          <button
                            onClick={addEditPayment}
                            className="text-sm text-brand-burgundy hover:text-brand-burgundy-dark flex items-center"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Agregar pago
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-dark-textSecondary">
                        Total pagos: {formatCurrency(editPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                      </div>
                    </div>

                    {/* Change in Edit */}
                    {editPayments.some(p => p.method === 'efectivo') && (
                      <div className="bg-success-50 border border-success-200 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-success-900">Cambio:</span>
                          <span className="text-lg font-bold text-success-600">
                            {(() => {
                              const totalCash = editPayments.filter(p => p.method === 'efectivo').reduce((sum, p) => sum + (p.amount || 0), 0);
                              const nonCashTotal = editPayments.filter(p => p.method !== 'efectivo').reduce((sum, p) => sum + (p.amount || 0), 0);
                              const total = editCart.reduce((sum, item) => sum + (item.subtotalAfterDiscount || (item.quantity * item.unitPrice)), 0);
                              const cashRequired = total - nonCashTotal;
                              const change = totalCash - cashRequired;
                              return formatCurrency(Math.max(0, change));
                            })()}
                          </span>
                        </div>
                      </div>
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

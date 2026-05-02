import React, { useState, useEffect, useCallback } from 'react';
import { salesAPI, productsAPI, servicesAPI, customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  ShoppingCart,
  DollarSign,
  Trash2,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');

  const fetchSales = useCallback(async () => {
    try {
      const response = await salesAPI.getAll({ date: selectedDate });
      setSales(response.data.data);
    } catch (error) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchServices();
    fetchCustomers();
  }, [selectedDate, fetchSales]);

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

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(cart.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateCommission = () => {
    return calculateTotal() * 0.1;
  };

  const calculateNetIncome = () => {
    return calculateTotal() - calculateCommission();
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error('Debes agregar al menos un producto o servicio');
      return;
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
        customer: selectedCustomer || null,
        notes,
        user: 'current-user' // This should come from auth context
      };

      await salesAPI.create(saleData);
      toast.success('Venta registrada correctamente');
      
      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setPaymentMethod('efectivo');
      setNotes('');
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="form-label">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
              />
            </div>
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

      {/* Sales Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Total</th>
                <th>Comisión</th>
                <th>Ingreso Neto</th>
                <th>Método</th>
                <th>Estado</th>
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
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="text-right">
                    {formatCurrency(sale.commission)}
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Nueva Venta</h3>
                
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

                    {/* Products */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {products.filter(p => p.stock > 0).map(product => (
                          <div key={product._id} className="border border-gray-200 rounded-lg p-3">
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
                          <div key={service._id} className="border border-gray-200 rounded-lg p-3">
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
                      <h4 className="font-medium text-gray-900 mb-3">Carrito</h4>
                      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
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
                    <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateTotal())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Comisión (10%):</span>
                        <span className="font-medium">{formatCurrency(calculateCommission())}</span>
                      </div>
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
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="form-input"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

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
    </div>
  );
};

export default Sales;

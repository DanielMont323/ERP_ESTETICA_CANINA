import React, { useState, useEffect } from 'react';
import { accountsPayableAPI } from '../services/api';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import { AlertTriangle, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatCalendarDate } from '../helpers/dateUtils';

const AccountsPayable = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMassivePaymentModal, setShowMassivePaymentModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'efectivo',
    notes: ''
  });
  const [massivePaymentData, setMassivePaymentData] = useState({
    paymentMethod: 'efectivo',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  // Manejo de ESC para cerrar modal de pago individual
  useEscapeKey(() => setShowPaymentModal(false), showPaymentModal);

  // Manejo de ESC para cerrar modal de pago masivo
  useEscapeKey(() => setShowMassivePaymentModal(false), showMassivePaymentModal);

  const fetchAccounts = async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await accountsPayableAPI.getAll(params);
      setAccounts(response.data.data);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      toast.error('Error al cargar cuentas por pagar');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilDueGMT7 = (dueDate) => {
    const today = new Date();
    const todayGMT7 = new Date(today.toLocaleString('en-US', { timeZone: 'America/Mazatlan' }));
    todayGMT7.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - todayGMT7;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateText = (dueDate, status) => {
    // Si la cuenta está pagada o cancelada, no mostrar días vencidos
    if (status === 'pagado' || status === 'cancelada') {
      return { text: status === 'pagado' ? 'Pagada' : 'Cancelada', color: status === 'pagado' ? 'green' : 'gray' };
    }
    
    const days = getDaysUntilDueGMT7(dueDate);
    if (days < 0) {
      return { text: `${Math.abs(days)} días vencida`, color: 'red' };
    } else if (days === 0) {
      return { text: 'Vence hoy', color: 'orange' };
    } else if (days === 1) {
      return { text: 'Vence mañana', color: 'yellow' };
    } else {
      return { text: `${days} días restantes`, color: 'green' };
    }
  };

  const getDiscountStatus = (discountInfo) => {
    if (!discountInfo || !discountInfo.available) {
      return { status: 'unavailable', color: 'gray', text: discountInfo?.reason || 'Sin descuento' };
    }
    if (discountInfo.daysRemaining > 0) {
      return { 
        status: 'available', 
        color: 'green', 
        text: `${discountInfo.daysRemaining} días` 
      };
    }
    return { status: 'expired', color: 'red', text: 'Vencido' };
  };

  const handlePaymentClick = (account) => {
    setSelectedAccount(account);
    
    // Calcular importe exigible (con descuento si aplica)
    const importeExigible = account.discountInfo?.available && account.descuentoDisponible > 0 
      ? (account.montoBase - account.descuentoDisponible) 
      : (account.montoBase || account.monto);
    
    setPaymentData({
      amount: account.saldo || importeExigible,
      paymentMethod: 'efectivo',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);

    try {
      const response = await accountsPayableAPI.pay(selectedAccount._id, {
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        user: user.id,
        notes: paymentData.notes
      });

      toast.success('Pago registrado correctamente');
      setShowPaymentModal(false);
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar pago');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelAccount = async (accountId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cuenta por pagar?')) {
      return;
    }

    try {
      await accountsPayableAPI.delete(accountId);
      toast.success('Cuenta cancelada correctamente');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cancelar cuenta');
    }
  };

  const handleReactivateAccount = async (accountId) => {
    if (!window.confirm('¿Deseas reactivar esta cuenta por pagar?\n\nLa cuenta volverá a estar activa con su saldo original.')) {
      return;
    }

    try {
      await accountsPayableAPI.reactivate(accountId);
      toast.success('Cuenta reactivada correctamente');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al reactivar cuenta');
    }
  };

  const handleSelectAccount = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleSelectAll = () => {
    const pendingAccounts = accounts.filter(a => a.status === 'pendiente');
    if (selectedAccounts.length === pendingAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(pendingAccounts.map(a => a._id));
    }
  };

  const getSelectedAccountsSummary = () => {
    const selected = accounts.filter(a => selectedAccounts.includes(a._id));
    const subtotal = selected.reduce((sum, a) => sum + (a.subtotal || a.montoBase || a.monto), 0);
    const iva = selected.reduce((sum, a) => sum + (a.ivaAmount || 0), 0);
    const total = selected.reduce((sum, a) => sum + a.saldo, 0);
    return { count: selected.length, subtotal, iva, total };
  };

  const handleMassivePaymentSubmit = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);

    try {
      const response = await accountsPayableAPI.payMassive({
        cuentaIds: selectedAccounts,
        paymentMethod: massivePaymentData.paymentMethod,
        user: user.id,
        notes: massivePaymentData.notes
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowMassivePaymentModal(false);
        setSelectedAccounts([]);
        fetchAccounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el pago masivo');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return <SkeletonTable rows={5} columns={10} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Cuentas por Pagar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los pagos a tus proveedores con descuentos por pronto pago
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cuentas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Accounts Summary */}
      {selectedAccounts.length > 0 && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedAccounts.length} cuenta{selectedAccounts.length !== 1 ? 's' : ''} seleccionada{selectedAccounts.length !== 1 ? 's' : ''}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  <span>Subtotal: {formatCurrency(getSelectedAccountsSummary().subtotal)}</span>
                  <span className="mx-2">|</span>
                  <span>IVA: {formatCurrency(getSelectedAccountsSummary().iva)}</span>
                  <span className="mx-2">|</span>
                  <span className="font-semibold">Total: {formatCurrency(getSelectedAccountsSummary().total)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowMassivePaymentModal(true)}
                className="btn btn-primary btn-md"
              >
                Pagar cuentas seleccionadas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      <div className="card">
        <div className="table-container">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedAccounts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
                  />
                </th>
                <th>Proveedor</th>
                <th>Número de Recibo</th>
                <th>Factura</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Saldo Pendiente</th>
                <th>Fecha Límite Descuento</th>
                <th>Fecha Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => {
                const discountStatus = getDiscountStatus(account.discountInfo);
                const dueDateText = getDueDateText(account.dueDate, account.status);
                return (
                  <tr key={account._id} className={`table-row-divider ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-100`}>
                    <td className="py-4">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account._id)}
                        onChange={() => handleSelectAccount(account._id)}
                        disabled={account.status !== 'pendiente'}
                        className="h-4 w-4 text-brand-burgundy focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="py-4">{account.proveedor?.name}</td>
                    <td className="py-4">{account.receiptNumber || '-'}</td>
                    <td className="py-4">{account.compra?.invoice || 'N/A'}</td>
                    <td className="py-4">{formatCurrency(account.subtotal || account.montoBase || account.monto)}</td>
                    <td className={`py-4 ${account.hasIVA ? 'text-blue-600' : 'text-gray-400'}`}>
                      {account.hasIVA ? formatCurrency(account.ivaAmount) : '$0.00'}
                    </td>
                    <td className="py-4 font-semibold">
                      {formatCurrency(account.monto)}
                    </td>
                    <td className="py-4">{formatCurrency(account.saldo)}</td>
                    <td className="py-4">
                      {account.discountDeadline ? (
                        <div>
                          <div className="text-sm">{formatCalendarDate(account.discountDeadline)}</div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            discountStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                            discountStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {discountStatus.text}
                          </span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-4">
                      <div className="text-sm">{formatCalendarDate(account.dueDate)}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        dueDateText.color === 'green' ? 'bg-green-100 text-green-800' :
                        dueDateText.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        dueDateText.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {dueDateText.text}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        account.status === 'pagado' ? 'bg-green-100 text-green-800' :
                        account.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handlePaymentClick(account)}
                          disabled={account.status === 'pagado' || account.status === 'cancelada'}
                          className={`text-sm font-medium ${
                            account.status === 'pagado' || account.status === 'cancelada'
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-brand-burgundy hover:text-primary-900'
                          }`}
                        >
                          {account.status === 'pagado' ? 'Pagado' : account.status === 'cancelada' ? 'Cancelada' : 'Pagar'}
                        </button>
                        {account.status === 'pendiente' && (
                          <button 
                            onClick={() => handleCancelAccount(account._id)}
                            className="text-sm font-medium text-red-600 hover:text-red-900"
                          >
                            Cancelar
                          </button>
                        )}
                        {account.status === 'cancelada' && (
                          <button 
                            onClick={() => handleReactivateAccount(account._id)}
                            className="text-sm font-medium text-green-600 hover:text-green-900"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onLimitChange={(limit) => setPagination({ ...pagination, limit, page: 1 })}
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {accounts.map((account) => {
          const discountStatus = getDiscountStatus(account.discountInfo);
          const dueDateText = getDueDateText(account.dueDate, account.status);
          return (
            <div key={account._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{account.proveedor?.name}</h3>
                  <p className="text-sm text-gray-600">Factura: {account.compra?.invoice || 'N/A'}</p>
                  {account.receiptNumber && (
                    <p className="text-sm text-gray-600">Recibo: {account.receiptNumber}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  account.status === 'pagado' ? 'bg-green-100 text-green-800' :
                  account.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {account.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(account.subtotal || account.montoBase || account.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA:</span>
                  <span className={account.hasIVA ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                    {account.hasIVA ? formatCurrency(account.ivaAmount) : '$0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold">{formatCurrency(account.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Saldo Pendiente:</span>
                  <span className="font-semibold text-brand-burgundy">{formatCurrency(account.saldo)}</span>
                </div>
                
                {account.discountDeadline && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Límite Descuento:</span>
                      <div className="text-right">
                        <div className="text-sm">{formatCalendarDate(account.discountDeadline)}</div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          discountStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                          discountStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {discountStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Vencimiento:</span>
                  <div className="text-right">
                    <div className="text-sm">{formatCalendarDate(account.dueDate)}</div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      dueDateText.color === 'green' ? 'bg-green-100 text-green-800' :
                      dueDateText.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                      dueDateText.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dueDateText.text}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 flex space-x-2">
                <button 
                  onClick={() => handlePaymentClick(account)}
                  disabled={account.status === 'pagado' || account.status === 'cancelada'}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                    account.status === 'pagado' || account.status === 'cancelada'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-brand-burgundy text-white hover:bg-primary-900'
                  }`}
                >
                  {account.status === 'pagado' ? 'Pagado' : account.status === 'cancelada' ? 'Cancelada' : 'Pagar'}
                </button>
                {account.status === 'pendiente' && (
                  <button 
                    onClick={() => handleCancelAccount(account._id)}
                    className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-900"
                  >
                    Cancelar
                  </button>
                )}
                {account.status === 'cancelada' && (
                  <button 
                    onClick={() => handleReactivateAccount(account._id)}
                    className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-900"
                  >
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowPaymentModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">Registrar Pago</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="form-label">Proveedor</label>
                <p className="text-gray-900 font-medium">{selectedAccount.proveedor?.name}</p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.subtotal || selectedAccount.montoBase || selectedAccount.monto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA ({selectedAccount.hasIVA ? (selectedAccount.ivaRate * 100).toFixed(0) + '%' : '0%'}):</span>
                    <span className={selectedAccount.hasIVA ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {formatCurrency(selectedAccount.ivaAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-semibold">Total Original:</span>
                    <span className="font-semibold">{formatCurrency(selectedAccount.montoBase || selectedAccount.monto)}</span>
                  </div>
                  {selectedAccount.discountInfo?.available && selectedAccount.descuentoDisponible > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="font-medium">Descuento Pronto Pago:</span>
                      <span className="font-medium">-{formatCurrency(selectedAccount.descuentoDisponible)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-semibold text-lg">Importe a Pagar:</span>
                    <span className="font-semibold text-lg text-brand-burgundy">
                      {formatCurrency(selectedAccount.discountInfo?.available && selectedAccount.descuentoDisponible > 0 
                        ? (selectedAccount.montoBase - selectedAccount.descuentoDisponible) 
                        : (selectedAccount.montoBase || selectedAccount.monto))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo Pendiente:</span>
                    <span className="font-semibold text-brand-burgundy">{formatCurrency(selectedAccount.saldo)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="amount" className="form-label">Monto a Pagar</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedAccount.discountInfo?.available && selectedAccount.descuentoDisponible > 0 
                    ? (selectedAccount.montoBase - selectedAccount.descuentoDisponible) 
                    : (selectedAccount.montoBase || selectedAccount.monto)}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="form-input text-lg"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="paymentMethod" className="form-label">Método de Pago</label>
                <select
                  id="paymentMethod"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="form-input"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="form-label">Notas (opcional)</label>
                <textarea
                  id="notes"
                  rows="3"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="form-input"
                  placeholder="Referencia, número de confirmación, etc."
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="btn btn-primary btn-md"
                >
                  {processingPayment ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Massive Payment Modal */}
      {showMassivePaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-overlay" onClick={() => setShowMassivePaymentModal(false)} />
            
            <div className="relative modal-content max-w-md w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">Pagar Cuentas Seleccionadas</h3>
                <button
                  onClick={() => setShowMassivePaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            
            <form onSubmit={handleMassivePaymentSubmit} className="p-4 md:p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuentas a pagar:</span>
                    <span className="font-medium">{selectedAccounts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(getSelectedAccountsSummary().subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">{formatCurrency(getSelectedAccountsSummary().iva)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-semibold">Total a pagar:</span>
                    <span className="font-semibold text-lg text-brand-burgundy">{formatCurrency(getSelectedAccountsSummary().total)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="massivePaymentMethod" className="form-label">Método de Pago</label>
                <select
                  id="massivePaymentMethod"
                  value={massivePaymentData.paymentMethod}
                  onChange={(e) => setMassivePaymentData({ ...massivePaymentData, paymentMethod: e.target.value })}
                  className="form-input"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="massiveNotes" className="form-label">Notas (opcional)</label>
                <textarea
                  id="massiveNotes"
                  rows="3"
                  value={massivePaymentData.notes}
                  onChange={(e) => setMassivePaymentData({ ...massivePaymentData, notes: e.target.value })}
                  className="form-input"
                  placeholder="Referencia, número de confirmación, etc."
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMassivePaymentModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="btn btn-primary btn-md"
                >
                  {processingPayment ? 'Procesando...' : `Pagar ${selectedAccounts.length} cuenta${selectedAccounts.length !== 1 ? 's' : ''}`}
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

export default AccountsPayable;

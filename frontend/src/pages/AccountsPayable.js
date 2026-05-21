import React, { useState, useEffect } from 'react';
import { accountsPayableAPI } from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AccountsPayable = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'efectivo',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountsPayableAPI.getAll();
      setAccounts(response.data.data);
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

  const getDiscountStatus = (discountInfo) => {
    if (!discountInfo || !discountInfo.available) {
      return { status: 'unavailable', color: 'gray', text: discountInfo?.reason || 'Sin descuento' };
    }
    if (discountInfo.daysRemaining > 0) {
      return { 
        status: 'available', 
        color: 'green', 
        text: `${discountInfo.daysRemaining} días restantes` 
      };
    }
    return { status: 'expired', color: 'red', text: 'Vencido' };
  };

  const handlePaymentClick = (account) => {
    setSelectedAccount(account);
    setPaymentData({
      amount: account.saldo,
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

      if (response.data.success) {
        toast.success(response.data.message);
        setShowPaymentModal(false);
        fetchAccounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el pago');
    } finally {
      setProcessingPayment(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Cuentas por Pagar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los pagos a tus proveedores con descuentos por pronto pago
          </p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Factura</th>
                <th>Monto Base</th>
                <th>Descuento</th>
                <th>Monto Final</th>
                <th>Saldo Pendiente</th>
                <th>Fecha Límite Descuento</th>
                <th>Fecha Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const discountStatus = getDiscountStatus(account.discountInfo);
                return (
                  <tr key={account._id}>
                    <td>{account.proveedor?.name}</td>
                    <td>{account.compra?.invoice || 'N/A'}</td>
                    <td>{formatCurrency(account.montoBase || account.monto)}</td>
                    <td className="text-green-600">
                      {account.descuentoDisponible > 0 ? formatCurrency(account.descuentoDisponible) : '-'}
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(account.monto)}
                    </td>
                    <td>{formatCurrency(account.saldo)}</td>
                    <td>
                      {account.discountDeadline ? (
                        <div>
                          <div className="text-sm">{new Date(account.discountDeadline).toLocaleDateString()}</div>
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
                    <td>
                      <div className="text-sm">{new Date(account.dueDate).toLocaleDateString()}</div>
                      {isOverdue(account.dueDate) && account.status === 'pendiente' && (
                        <span className="text-xs text-red-600 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Vencido
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        account.status === 'pagado' ? 'bg-green-100 text-green-800' :
                        account.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handlePaymentClick(account)}
                        disabled={account.status === 'pagado'}
                        className={`text-sm font-medium ${
                          account.status === 'pagado' 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-primary-600 hover:text-primary-900'
                        }`}
                      >
                        {account.status === 'pagado' ? 'Pagado' : 'Pagar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {accounts.map((account) => {
            const discountStatus = getDiscountStatus(account.discountInfo);
            return (
              <div key={account._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{account.proveedor?.name}</h3>
                    <p className="text-sm text-gray-600">Factura: {account.compra?.invoice || 'N/A'}</p>
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
                    <span className="text-gray-600">Monto Base:</span>
                    <span className="font-medium">{formatCurrency(account.montoBase || account.monto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="text-green-600 font-medium">
                      {account.descuentoDisponible > 0 ? formatCurrency(account.descuentoDisponible) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto Final:</span>
                    <span className="font-semibold">{formatCurrency(account.monto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo Pendiente:</span>
                    <span className="font-semibold text-primary-600">{formatCurrency(account.saldo)}</span>
                  </div>
                  
                  {account.discountDeadline && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Límite Descuento:</span>
                        <div className="text-right">
                          <div className="text-sm">{new Date(account.discountDeadline).toLocaleDateString()}</div>
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
                      <div className="text-sm">{new Date(account.dueDate).toLocaleDateString()}</div>
                      {isOverdue(account.dueDate) && account.status === 'pendiente' && (
                        <span className="text-xs text-red-600 flex items-center justify-end">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Vencido
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button 
                    onClick={() => handlePaymentClick(account)}
                    disabled={account.status === 'pagado'}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium ${
                      account.status === 'pagado' 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {account.status === 'pagado' ? 'Pagado' : 'Pagar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 md:p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Pago</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <p className="text-gray-900 font-medium">{selectedAccount.proveedor?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Pendiente
                </label>
                <p className="text-gray-900 font-medium text-lg">{formatCurrency(selectedAccount.saldo)}</p>
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Monto a Pagar
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedAccount.saldo}
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  id="paymentMethod"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  id="notes"
                  rows="3"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  placeholder="Referencia, número de confirmación, etc."
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="w-full sm:w-auto px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {processingPayment ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayable;

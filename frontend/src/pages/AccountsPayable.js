import React, { useState, useEffect } from 'react';
import { accountsPayableAPI } from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

const AccountsPayable = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-2xl font-semibold text-gray-900">Cuentas por Pagar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los pagos a tus proveedores con descuentos por pronto pago
          </p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        <div className="overflow-x-auto">
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
                      <button className="text-primary-600 hover:text-primary-900 text-sm">
                        Pagar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayable;

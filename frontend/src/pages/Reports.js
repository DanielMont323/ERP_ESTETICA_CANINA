import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Skeleton, { SkeletonCard } from '../components/Skeleton';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const Reports = () => {
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    useRange: false
  });

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const params = {};
        if (dateRange.useRange) {
          if (dateRange.startDate) params.startDate = dateRange.startDate;
          if (dateRange.endDate) params.endDate = dateRange.endDate;
        } else {
          params.period = selectedPeriod;
        }

        const [incomeRes, salesRes] = await Promise.all([
          reportsAPI.getIncomeStatement(params),
          reportsAPI.getSalesSummary(params)
        ]);
        
        setIncomeStatement(incomeRes.data.data);
        setSalesSummary(salesRes.data.data);
      } catch (error) {
        toast.error('Error al cargar reportes');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedPeriod, dateRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="title" className="w-48" />
            <Skeleton variant="text" className="w-64 mt-2" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton variant="input" className="w-32" />
            <Skeleton variant="button" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analiza el rendimiento de tu negocio
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange.useRange ? 'custom' : selectedPeriod}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'custom') {
                setDateRange({ ...dateRange, useRange: true });
              } else {
                setDateRange({ startDate: '', endDate: '', useRange: false });
                setSelectedPeriod(value);
              }
            }}
            className="form-input"
          >
            <option value="day">Diario</option>
            <option value="week">Semanal</option>
            <option value="month">Mensual</option>
            <option value="year">Anual</option>
            <option value="custom">Rango personalizado</option>
          </select>
          {dateRange.useRange && (
            <>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="form-input"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="form-input"
                min={dateRange.startDate}
              />
            </>
          )}
          <button className="btn btn-secondary btn-md">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Income Statement */}
      {incomeStatement && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Resumen de Resultados Financieros</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Ingresos</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ventas totales:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.ingresos.totalVentas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisiones:</span>
                    <span className="font-medium text-danger-600">-{formatCurrency(incomeStatement.ingresos.totalComision)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Ingreso neto:</span>
                    <span className="text-success-600">{formatCurrency(incomeStatement.ingresos.totalIngresoNeto)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Gastos</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Compras:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.costos.totalCompras)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costos fijos:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.costos.costosFijos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costos variables:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.costos.costosVariables)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total gastos:</span>
                    <span className="text-danger-600">{formatCurrency(
                      incomeStatement.costos.totalCompras + 
                      incomeStatement.costos.costosFijos + 
                      incomeStatement.costos.costosVariables
                    )}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Resultado Neto</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Utilidad bruta:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.utilidad.utilidadBruta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilidad operativa:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.utilidad.utilidadOperativa)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Resultado neto:</span>
                    <span className={`font-bold ${
                      incomeStatement.utilidad.utilidadOperativa >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {formatCurrency(incomeStatement.utilidad.utilidadOperativa)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Summary */}
      {salesSummary && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Resumen de Ventas</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Productos Más Vendidos</h4>
                <div className="space-y-2">
                  {salesSummary.topProducts?.map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{product.name}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(product.totalRevenue)}</div>
                        <div className="text-sm text-gray-500">{product.totalQuantity} unidades</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Ventas por Método de Pago</h4>
                <div className="space-y-2">
                  {salesSummary.salesByPaymentMethod?.map((method, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize">{method._id}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(method.total)}</div>
                        <div className="text-sm text-gray-500">{method.count} ventas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica 1: Ingresos vs Gastos */}
        {incomeStatement && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Ingresos vs Gastos</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Ingresos', valor: incomeStatement.ingresos.totalIngresoNeto },
                  { name: 'Gastos', valor: incomeStatement.costos.totalCompras + incomeStatement.costos.costosFijos + incomeStatement.costos.costosVariables }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="valor" fill="#3b82f6" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfica 2: Resultado Neto */}
        {incomeStatement && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Resultado Neto</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { name: 'Resultado Neto', valor: incomeStatement.utilidad.utilidadOperativa }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke={incomeStatement.utilidad.utilidadOperativa >= 0 ? "#16a34a" : "#dc2626"} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfica 3: Ventas por Categoría */}
        {salesSummary && salesSummary.topProducts && (
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Productos Más Vendidos</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesSummary.topProducts.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="#8b5cf6" name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

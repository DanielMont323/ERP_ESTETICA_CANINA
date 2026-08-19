import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Skeleton, { SkeletonCard } from '../components/Skeleton';
import { Download, TrendingUp, DollarSign, ShoppingCart, CreditCard, Store, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Reports = () => {
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesBehavior, setSalesBehavior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    useRange: false
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

        // Intentar cargar comportamiento de ventas, pero no fallar si hay error
        try {
          const behaviorRes = await reportsAPI.getSalesBehavior(params);
          setSalesBehavior(behaviorRes.data.data);
        } catch (behaviorError) {
          console.warn('No se pudo cargar comportamiento de ventas:', behaviorError);
          setSalesBehavior(null);
        }
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getPeriodDisplay = () => {
    if (dateRange.useRange && dateRange.startDate && dateRange.endDate) {
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    }
    
    const periodNames = {
      'day': 'Hoy',
      'week': 'Esta semana',
      'month': 'Este mes',
      'year': 'Este año'
    };
    return periodNames[selectedPeriod] || '';
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (dateRange.useRange) {
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;
      } else {
        params.period = selectedPeriod;
      }

      const response = await reportsAPI.exportSales(params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const start = dateRange.startDate || new Date().toISOString().split('T')[0];
      const end = dateRange.endDate || new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Reporte_Ventas_${start}_${end}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
    }
  };

  const getChannelName = (channel) => {
    const names = {
      'local': 'Local comercial',
      'mercado_libre': 'Mercado Libre',
      'redes_sociales': 'Redes sociales'
    };
    return names[channel] || channel;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">REPORTE DE VENTAS</h1>
          <p className="mt-1 text-sm text-brand-burgundy">
            Periodo: {getPeriodDisplay()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
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
          <button 
            onClick={handleExportExcel}
            className="btn btn-secondary btn-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Comportamiento de Ventas - KPIs */}
      {salesBehavior && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesBehavior.totalMonto)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{salesBehavior.totalVentas} ventas</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesBehavior.ticketPromedio)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Por venta</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Unidades Vendidas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{salesBehavior.totalUnidades}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Total productos</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Canal Principal</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 truncate">{getChannelName(salesBehavior.canalPrincipal)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Store className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Más ventas</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Método Principal</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{salesBehavior.metodoPagoPrincipal}</p>
                </div>
                <div className="p-3 bg-pink-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-pink-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Más usado</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-burgundy">Producto Top</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 truncate">{salesBehavior.productoMasVendido || 'N/A'}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Más vendido</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen Financiero */}
      {incomeStatement && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">RESUMEN DE RESULTADOS FINANCIEROS</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-r border-gray-200 pr-6 md:border-r md:pr-6 border-b md:border-b pb-6 md:pb-0 mb-6 md:mb-0">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  INGRESOS
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Ventas totales:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.ingresos.totalVentas)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Comisiones:</span>
                    <span className="font-semibold text-danger-600">-{formatCurrency(incomeStatement.ingresos.totalComision)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900">Ingreso Neto:</span>
                    <span className="text-success-600">{formatCurrency(incomeStatement.ingresos.totalIngresoNeto)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-r border-gray-200 pr-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  GASTOS
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Compras:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.costos.totalCompras)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Costos fijos:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.costos.costosFijos)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Costos variables:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.costos.costosVariables)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900">Total Gastos:</span>
                    <span className="text-danger-600">{formatCurrency(
                      incomeStatement.costos.totalCompras + 
                      incomeStatement.costos.costosFijos + 
                      incomeStatement.costos.costosVariables
                    )}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  RESULTADO NETO
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Utilidad bruta:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.utilidad.utilidadBruta)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-burgundy">Utilidad operativa:</span>
                    <span className="font-semibold">{formatCurrency(incomeStatement.utilidad.utilidadOperativa)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900">Resultado Neto:</span>
                    <span className={`font-bold ${
                      incomeStatement.utilidad.utilidadOperativa >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {formatCurrency(incomeStatement.utilidad.utilidadOperativa)}
                    </span>
                  </div>
                  {incomeStatement.utilidad.utilidadOperativa !== 0 && (
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-brand-burgundy">Margen neto:</span>
                      <span className={`font-semibold ${
                        incomeStatement.utilidad.utilidadOperativa >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {incomeStatement.utilidad.margenOperativo}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos vs Gastos */}
        {incomeStatement && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">INGRESOS VS GASTOS</h3>
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
                  <Bar dataKey="valor" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Métodos de Pago - Donut Chart */}
        {salesSummary && salesSummary.salesByPaymentMethod && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">VENTAS POR MÉTODO DE PAGO</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesSummary.salesByPaymentMethod.map((method, index) => ({
                      name: method._id.charAt(0).toUpperCase() + method._id.slice(1),
                      value: method.total,
                      count: method.count
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesSummary.salesByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {salesSummary.salesByPaymentMethod.map((method, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{method._id}:</span>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(method.total)}</span>
                      <span className="text-gray-500 ml-2">({method.count} ventas)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ventas por Canal */}
      {salesSummary && salesSummary.salesByChannel && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">VENTAS POR CANAL</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="order-2 lg:order-1">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesSummary.salesByChannel.map(channel => ({
                    name: getChannelName(channel._id),
                    total: channel.total,
                    netIncome: channel.netIncome
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" />
                    <Bar dataKey="netIncome" fill="#10b981" name="Ingreso Neto" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 order-1 lg:order-2">
                <h4 className="font-medium text-gray-900">Resumen por Canal</h4>
                {salesSummary.salesByChannel.map((channel, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">{getChannelName(channel._id)}</span>
                      <span className="text-sm text-gray-500">{channel.count} ventas</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-burgundy">Total:</span>
                      <span className="font-semibold">{formatCurrency(channel.total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-burgundy">Ingreso Neto:</span>
                      <span className="font-semibold text-success-600">{formatCurrency(channel.netIncome)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos Más Vendidos */}
      {salesSummary && salesSummary.topProducts && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">PRODUCTOS MÁS VENDIDOS</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
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
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 mb-3">Top 10 Productos</h4>
                {salesSummary.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(product.totalRevenue)}</div>
                      <div className="text-sm text-gray-500">{product.totalQuantity} unidades</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tendencia de Ventas */}
      {salesSummary && salesSummary.salesByPeriod && salesSummary.salesByPeriod.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">TENDENCIA DE VENTAS</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesSummary.salesByPeriod.map(item => ({
                name: selectedPeriod === 'day' ? `${item._id.day}/${item._id.month}` :
                      selectedPeriod === 'week' ? `Semana` :
                      selectedPeriod === 'month' ? `${item._id.month}/${item._id.year}` :
                      `${item._id.month}/${item._id.year}`,
                ventas: item.totalSales,
                ingresoNeto: item.totalNetIncome
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas" />
                <Line type="monotone" dataKey="ingresoNeto" stroke="#10b981" strokeWidth={2} name="Ingreso Neto" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

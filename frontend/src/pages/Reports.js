import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Download
} from 'lucide-react';

const Reports = () => {
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [incomeRes, salesRes] = await Promise.all([
          reportsAPI.getIncomeStatement(),
          reportsAPI.getSalesSummary({ period: selectedPeriod })
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
  }, [selectedPeriod]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
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
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analiza el rendimiento de tu negocio
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="form-input"
          >
            <option value="day">Diario</option>
            <option value="month">Mensual</option>
            <option value="year">Anual</option>
          </select>
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
            <h3 className="text-lg font-medium text-gray-900">Estado de Resultados</h3>
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
                  <div className="flex justify-between text-lg font-bold">
                    <span>Ingreso neto:</span>
                    <span className="text-success-600">{formatCurrency(incomeStatement.ingresos.totalIngresoNeto)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Costos</h4>
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
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Utilidad</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Utilidad bruta:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.utilidad.utilidadBruta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilidad operativa:</span>
                    <span className="font-medium">{formatCurrency(incomeStatement.utilidad.utilidadOperativa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margen bruto:</span>
                    <span className="font-medium">{incomeStatement.utilidad.margenBruto}%</span>
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

      {/* Placeholder for charts */}
      <div className="card">
        <div className="card-body">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Gráficos interactivos próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

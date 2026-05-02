import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, productsAPI, remindersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  DollarSign,
  Package,
  Calendar,
  Users,
  ShoppingCart,
  FileText,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await reportsAPI.getDashboard();
        setDashboardData(response.data.data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setDashboardData({
          sales: { currentMonth: { total: 0, count: 0 }, lastMonth: { total: 0, count: 0 }, growth: { total: 0, count: 0 } },
          alerts: { lowStockProducts: 0, overdueAccounts: 0, todayReminders: 0 },
          recentSales: [],
          upcomingReminders: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [productsRes, remindersRes] = await Promise.all([
        productsAPI.getLowStock(),
        remindersAPI.getUpcoming()
      ]);
      
      setLowStockProducts(productsRes.data.data.slice(0, 5));
      setUpcomingReminders(remindersRes.data.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              {change !== undefined && (
                <div className={`flex items-center mt-1 text-sm ${
                  changeType === 'positive' ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {changeType === 'positive' ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Bienvenido al sistema ERP. Aquí tienes un resumen de tu negocio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(dashboardData?.sales?.currentMonth?.total || 0)}
          change={dashboardData?.sales?.growth?.total}
          changeType={dashboardData?.sales?.growth?.total >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          color="bg-primary-600"
        />
        <StatCard
          title="Número de ventas"
          value={dashboardData?.sales?.currentMonth?.count || 0}
          change={dashboardData?.sales?.growth?.count}
          changeType={dashboardData?.sales?.growth?.count >= 0 ? 'positive' : 'negative'}
          icon={ShoppingCart}
          color="bg-success-600"
        />
        <StatCard
          title="Productos con bajo stock"
          value={dashboardData?.alerts?.lowStockProducts || 0}
          icon={Package}
          color="bg-warning-600"
        />
        <StatCard
          title="Cuentas vencidas"
          value={dashboardData?.alerts?.overdueAccounts || 0}
          icon={FileText}
          color="bg-danger-600"
        />
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Productos con bajo stock</h3>
              <Package className="h-5 w-5 text-warning-600" />
            </div>
          </div>
          <div className="card-body">
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-warning-600">{product.stock} unidades</p>
                      <p className="text-sm text-gray-600">Mínimo: {product.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay productos con bajo stock
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Próximos recordatorios</h3>
              <Calendar className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <div className="card-body">
            {upcomingReminders.length > 0 ? (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder._id} className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{reminder.title}</p>
                      <p className="text-sm text-gray-600">{reminder.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary-600">
                        {new Date(reminder.date).toLocaleDateString('es-MX')}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        reminder.priority === 'alta' ? 'badge-danger' :
                        reminder.priority === 'media' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {reminder.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay recordatorios próximos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Acciones rápidas</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/sales')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <ShoppingCart className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Nueva venta</p>
            </button>
            <button 
              onClick={() => navigate('/products')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Agregar producto</p>
            </button>
            <button 
              onClick={() => navigate('/customers')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Nuevo cliente</p>
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <FileText className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Generar reporte</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

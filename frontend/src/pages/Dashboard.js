import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, productsAPI, remindersAPI, accountsPayableAPI, petsAPI } from '../services/api';
import { SkeletonStats } from '../components/Skeleton';
import { formatCalendarDate, getCalendarDay, getCalendarMonth, getMonthName } from '../helpers/dateUtils';
import {
  DollarSign,
  Package,
  Calendar,
  Users,
  ShoppingCart,
  FileText,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  X,
  Dog,
  ChevronDown,
  ChevronUp,
  Bell,
  Cake
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [remindersData, setRemindersData] = useState(null);
  const [manualReminders, setManualReminders] = useState(null);
  const [birthdayData, setBirthdayData] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentMonth = new Date().getMonth() + 1;
        const [reportsRes, remindersRes, expiringRes, pendingRes, birthdaysRes] = await Promise.all([
          reportsAPI.getDashboard(),
          remindersAPI.getDashboard(),
          productsAPI.getExpiring(120),
          remindersAPI.getPending(),
          petsAPI.getBirthdays(currentMonth)
        ]);
        setDashboardData(reportsRes.data.data);
        setRemindersData({
          ...remindersRes.data.data,
          expiringProducts: expiringRes.data.data
        });
        setManualReminders(pendingRes.data.data || []);
        setBirthdayData(birthdaysRes.data.data || []);
        
        // Mostrar alerta si hay cuentas vencidas o que vencen mañana
        const urgentAccounts = remindersRes.data.data.accounts.filter(
          acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana'
        );
        if (urgentAccounts.length > 0 || expiringRes.data.data.length > 0) {
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setDashboardData({
          sales: { currentMonth: { total: 0, count: 0 }, lastMonth: { total: 0, count: 0 }, growth: { total: 0, count: 0 } },
          alerts: { lowStockProducts: 0, overdueAccounts: 0, todayReminders: 0 },
          recentSales: [],
          upcomingReminders: []
        });
        setRemindersData({
          accounts: [],
          vaccines: [],
          lowStockProducts: [],
          expiringProducts: [],
          counts: { accounts: 0, vaccines: 0, lowStockProducts: 0 }
        });
        setManualReminders([]);
        setBirthdayData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getMonthName = (month) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  };

  const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
    return (
      <div className="card hover:shadow-md transition-shadow duration-200">
        <div className="card-body p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-textSecondary mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">{value}</p>
              {change !== undefined && (
                <div className={`flex items-center text-sm ${
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
            <div className={`p-4 rounded-xl ${color} ml-4 flex-shrink-0`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <SkeletonStats />;
  }

  return (
    <div className="space-y-6">
      {/* Alert for urgent accounts */}
      {showAlert && remindersData?.accounts?.filter(acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana').length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-semibold text-warning-900">
                  {remindersData.accounts.filter(acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana').length} cuenta{remindersData.accounts.filter(acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana').length > 1 ? 's' : ''} por pagar requiere{remindersData.accounts.filter(acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana').length > 1 ? 'n' : ''} atención
                </h3>
                <div className="mt-2 space-y-1">
                  {remindersData.accounts.filter(acc => acc.urgency === 'vencida' || acc.urgency === 'hoy' || acc.urgency === 'manana').map((account) => (
                    <div key={account.id} className="text-sm text-warning-800">
                      <span className="font-medium">{account.title}</span>
                      {' - '}
                      {formatCurrency(account.amount)}
                      {' - '}
                      {account.urgencyText}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="text-warning-400 hover:text-warning-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-brand-burgundy">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-dark-textSecondary">
          Bienvenido al sistema ERP. Aquí tienes un resumen de tu negocio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(dashboardData?.sales?.currentMonth?.total || 0)}
          change={dashboardData?.sales?.growth?.total}
          changeType={dashboardData?.sales?.growth?.total >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          color="bg-brand-burgundy"
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

      {/* Attention Required Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-6">Atención requerida</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Mascotas - Vacunas Próximas */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'pets' ? null : 'pets')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-brand-cream text-brand-burgundy mr-4">
                  <Dog className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Mascotas</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Vacunas próximas</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {remindersData?.counts?.vaccines || 0}
                </span>
                {expandedSection === 'pets' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'pets' && (
            <div className="card-body border-t border-gray-200 p-5">
              {remindersData?.vaccines?.length > 0 ? (
                <div className="space-y-3">
                  {remindersData.vaccines.map((vaccine) => (
                    <div 
                      key={vaccine.id} 
                      className="p-4 bg-brand-cream rounded-lg cursor-pointer hover:bg-brand-cream/90 transition-colors"
                      onClick={() => navigate('/vaccination-cards', { state: { mascotaId: vaccine.mascotaId } })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={vaccine.mascotaNombre}>{vaccine.mascotaNombre}</p>
                          <p className="text-sm text-gray-600 dark:text-dark-textSecondary truncate" title={vaccine.title}>{vaccine.title}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-brand-burgundy">
                            {formatCalendarDate(vaccine.date)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            vaccine.urgency === 'hoy' ? 'badge-warning' :
                            vaccine.urgency === 'manana' ? 'badge-info' : 'badge-success'
                          }`}>
                            {vaccine.urgencyText}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-dark-textSecondary text-center py-6">
                  ✓ No hay vacunas próximas
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cuentas por Pagar */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'accounts' ? null : 'accounts')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-success-100 text-success-600 mr-4">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Cuentas por Pagar</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Pagos pendientes</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {remindersData?.counts?.accounts || 0}
                </span>
                {expandedSection === 'accounts' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'accounts' && (
            <div className="card-body border-t border-gray-200 p-5">
              {remindersData?.accounts?.length > 0 ? (
                <div className="space-y-3">
                  {remindersData.accounts.map((account) => (
                    <div 
                      key={account.id} 
                      className="p-4 bg-success-50 rounded-lg cursor-pointer hover:bg-success-100/90 transition-colors"
                      onClick={() => navigate('/accounts-payable')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={account.title}>{account.title}</p>
                          <p className="text-sm text-gray-600 dark:text-dark-textSecondary truncate" title={account.description}>{account.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-success-600">
                            {formatCurrency(account.amount)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            account.urgency === 'vencida' ? 'badge-danger' :
                            account.urgency === 'hoy' ? 'badge-warning' :
                            account.urgency === 'manana' ? 'badge-info' : 'badge-success'
                          }`}>
                            {account.urgencyText}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-dark-textSecondary text-center py-6">
                  ✓ No hay pagos pendientes próximos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Productos - Stock Bajo */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'products' ? null : 'products')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-warning-100 text-warning-600 mr-4">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Productos</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Stock bajo</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {remindersData?.counts?.lowStockProducts || 0}
                </span>
                {expandedSection === 'products' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'products' && (
            <div className="card-body border-t border-gray-200 p-5">
              {remindersData?.lowStockProducts?.length > 0 ? (
                <div className="space-y-3">
                  {remindersData.lowStockProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="p-4 bg-warning-50 rounded-lg cursor-pointer hover:bg-warning-100/90 transition-colors"
                      onClick={() => navigate('/products')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={product.title}>{product.title}</p>
                          <p className="text-sm text-gray-600 dark:text-dark-textSecondary truncate" title={`SKU: ${product.sku}`}>SKU: {product.sku}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-warning-600">
                            Stock: {product.stock}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-dark-textSecondary">Mínimo: {product.minStock}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-dark-textSecondary text-center py-6">
                  ✓ No hay productos con stock bajo
                </p>
              )}
            </div>
          )}
        </div>

        {/* Productos - Por Caducar */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'expiring' ? null : 'expiring')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-orange-100 text-orange-600 mr-4">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Productos</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Por caducar</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {remindersData?.expiringProducts?.length || 0}
                </span>
                {expandedSection === 'expiring' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'expiring' && (
            <div className="card-body border-t border-gray-200 p-5">
              {remindersData?.expiringProducts?.length > 0 ? (
                <div className="space-y-3">
                  {remindersData.expiringProducts
                    .sort((a, b) => {
                      const today = new Date();
                      const todayGMT7 = new Date(today.toLocaleString('en-US', { timeZone: 'America/Mazatlan' }));
                      const daysA = Math.ceil((new Date(a.expirationDate) - todayGMT7) / (1000 * 60 * 60 * 24));
                      const daysB = Math.ceil((new Date(b.expirationDate) - todayGMT7) / (1000 * 60 * 60 * 24));
                      return daysA - daysB;
                    })
                    .map((product) => {
                    const today = new Date();
                    const todayGMT7 = new Date(today.toLocaleString('en-US', { timeZone: 'America/Mazatlan' }));
                    const daysUntilExpiration = Math.ceil((new Date(product.expirationDate) - todayGMT7) / (1000 * 60 * 60 * 24));
                    let status, bgColor, textColor;
                    
                    if (daysUntilExpiration < 0) {
                      status = '🔴 Caducado';
                      bgColor = 'bg-red-50';
                      textColor = 'text-red-600';
                    } else if (daysUntilExpiration <= 30) {
                      status = '🟠 Próximo';
                      bgColor = 'bg-orange-50';
                      textColor = 'text-orange-600';
                    } else {
                      status = '🟢 Vigente';
                      bgColor = 'bg-green-50';
                      textColor = 'text-green-600';
                    }
                    
                    return (
                      <div 
                        key={product._id} 
                        className={`p-4 ${bgColor} rounded-lg cursor-pointer hover:opacity-90 transition-colors`}
                        onClick={() => navigate('/products')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={product.name}>{product.name}</p>
                            <p className="text-sm text-gray-600 dark:text-dark-textSecondary truncate" title={`SKU: ${product.sku}`}>SKU: {product.sku}</p>
                            {product.lotNumber && (
                              <p className="text-xs text-gray-500 dark:text-dark-textSecondary truncate" title={`Lote: ${product.lotNumber}`}>Lote: {product.lotNumber}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-semibold ${textColor}`}>
                              {status}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-dark-textSecondary">
                              {daysUntilExpiration < 0 
                                ? `${Math.abs(daysUntilExpiration)} días vencido`
                                : `${daysUntilExpiration} días restantes`
                              }
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                              {formatCalendarDate(product.expirationDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-dark-textSecondary text-center py-6">
                  ✓ No hay productos perecederos próximos a caducar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cumpleaños de Mascotas */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'birthdays' ? null : 'birthdays')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-pink-100 text-pink-600 mr-4">
                  <Cake className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Cumpleaños de mascotas</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">{getMonthName(new Date().getMonth() + 1)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {birthdayData?.length || 0}
                </span>
                {expandedSection === 'birthdays' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'birthdays' && (
            <div className="card-body border-t border-gray-200 p-5">
              {birthdayData?.length > 0 ? (
                <div className="space-y-3">
                  {birthdayData.map((pet) => (
                    <div 
                      key={pet._id} 
                      className="p-4 bg-pink-50 rounded-lg cursor-pointer hover:bg-pink-100/90 transition-colors"
                      onClick={() => navigate('/pets')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={pet.name}>{pet.name}</p>
                          <p className="text-sm text-gray-600 dark:text-dark-textSecondary truncate">
                            {getCalendarDay(pet.birthDate)} de {getMonthName(getCalendarMonth(pet.birthDate))}
                          </p>
                          {pet.owner && (
                            <p className="text-xs text-gray-500 dark:text-dark-textSecondary truncate">Dueño: {pet.owner.name}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Dog className="h-5 w-5 text-pink-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {birthdayData.length > 7 && (
                    <button 
                      onClick={() => navigate('/pets')}
                      className="w-full text-center text-sm text-pink-600 hover:text-pink-800 font-medium py-2"
                    >
                      Ver todos ({birthdayData.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Cake className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                    No hay mascotas que cumplan años este mes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recordatorios Manuales */}
        <div className="card hover:shadow-md transition-shadow duration-200">
          <div 
className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors p-5"
            onClick={() => setExpandedSection(expandedSection === 'reminders' ? null : 'reminders')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-purple-100 text-purple-600 mr-4">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Recordatorios</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-textSecondary">Tareas pendientes</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-dark-text mr-3">
                  {manualReminders?.length || 0}
                </span>
                {expandedSection === 'reminders' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary" />
                )}
              </div>
            </div>
          </div>
          {expandedSection === 'reminders' && (
            <div className="card-body border-t border-gray-200 p-5">
              {manualReminders?.length > 0 ? (
                <div className="space-y-3">
                  {manualReminders.map((reminder) => (
                    <div 
                      key={reminder._id} 
                      className="p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100/90 transition-colors"
                      onClick={() => navigate('/reminders')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-medium text-gray-900 dark:text-dark-text truncate" title={reminder.title}>{reminder.title}</p>
                          {reminder.description && (
                            <p className="text-sm text-gray-600 dark:text-dark-textSecondary line-clamp-2" title={reminder.description}>{reminder.description}</p>
                          )}
                          <div className="flex items-center text-sm text-gray-600 dark:text-dark-textSecondary mt-2">
                            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                            {formatCalendarDate(reminder.date)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`capitalize badge badge-${
                            reminder.priority === 'alta' ? 'danger' :
                            reminder.priority === 'media' ? 'warning' : 'success'
                          }`}>
                            {reminder.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {manualReminders.length > 7 && (
                    <button 
                      onClick={() => navigate('/reminders')}
                      className="w-full text-center text-sm text-purple-600 hover:text-purple-800 font-medium py-2"
                    >
                      Ver todos ({manualReminders.length})
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-dark-textSecondary text-center py-6">
                  ✓ No hay recordatorios pendientes
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card hover:shadow-md transition-shadow duration-200">
        <div className="card-header p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Acciones rápidas</h3>
        </div>
        <div className="card-body p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/sales')}
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-burgundy hover:bg-brand-cream hover:shadow-sm transition-all duration-200 cursor-pointer group"
            >
              <ShoppingCart className="h-7 w-7 text-brand-burgundy mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Nueva venta</p>
            </button>
            <button 
              onClick={() => navigate('/products')}
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-burgundy hover:bg-brand-cream hover:shadow-sm transition-all duration-200 cursor-pointer group"
            >
              <Package className="h-7 w-7 text-brand-burgundy mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Agregar producto</p>
            </button>
            <button 
              onClick={() => navigate('/customers')}
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-burgundy hover:bg-brand-cream hover:shadow-sm transition-all duration-200 cursor-pointer group"
            >
              <Users className="h-7 w-7 text-brand-burgundy mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Nuevo cliente</p>
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-burgundy hover:bg-brand-cream hover:shadow-sm transition-all duration-200 cursor-pointer group"
            >
              <FileText className="h-7 w-7 text-brand-burgundy mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Generar reporte</p>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;

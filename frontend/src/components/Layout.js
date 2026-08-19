import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Package,
  ShoppingCart,
  ShoppingCart as PurchasesIcon,
  Users,
  Heart,
  Scissors,
  Truck,
  FileText,
  DollarSign,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Syringe,
  Tag,
  Box
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Atajos de teclado globales F1-F12 con comportamiento contextual
  useEffect(() => {
    const handleKeyDown = (e) => {
      // No disparar atajos si el usuario está escribiendo en un input, textarea o select
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.tagName === 'SELECT' ||
                     target.isContentEditable;
      
      if (isInput) return;

      // Mapa de atajos F1-F12
      const shortcuts = {
        'F1': '/dashboard',
        'F2': '/products',
        'F3': '/suppliers',
        'F4': '/purchases',
        'F5': '/sales',
        'F6': '/customers',
        'F7': '/pets',
        'F8': '/vaccines-catalog',
        'F9': '/services',
        'F10': '/accounts-payable',
        'F11': '/reports',
        'F12': '/settings'
      };

      if (shortcuts[e.key]) {
        e.preventDefault();
        const targetRoute = shortcuts[e.key];
        
        // F12 puede no ser interceptable por el navegador (DevTools)
        if (e.key === 'F12') {
          // Intentar navegar, pero el navegador puede abrir DevTools de todos modos
          navigate(targetRoute);
          return;
        }
        
        // Comportamiento contextual
        if (location.pathname === targetRoute) {
          // Ya estamos en el módulo: ejecutar acción principal
          const actionEvents = {
            'F2': 'openNewProduct',
            'F3': 'openNewSupplier',
            'F4': 'openNewPurchase',
            'F5': 'openNewSale',
            'F6': 'openNewCustomer',
            'F7': 'openNewPet',
            'F8': 'openNewVaccine',
            'F9': 'openNewService',
            'F10': 'openNewPayment',
            'F11': 'openReportAction',
            'F12': 'openSettingsAction'
          };
          
          const actionEvent = actionEvents[e.key];
          if (actionEvent) {
            window.dispatchEvent(new CustomEvent(actionEvent));
          }
        } else {
          // No estamos en el módulo: navegar
          navigate(targetRoute);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, shortcut: 'F1' },
    { name: 'Productos', href: '/products', icon: Package, shortcut: 'F2' },
    { name: 'Categorías Productos', href: '/product-categories', icon: Tag },
    { name: 'Pedidos Proveedores', href: '/low-stock-orders', icon: Box },
    { name: 'Ventas', href: '/sales', icon: ShoppingCart, shortcut: 'F5' },
    { name: 'Compras', href: '/purchases', icon: PurchasesIcon, shortcut: 'F4' },
    { name: 'Clientes', href: '/customers', icon: Users, shortcut: 'F6' },
    { name: 'Mascotas', href: '/pets', icon: Heart, shortcut: 'F7' },
    { name: 'Carnet Vacunación', href: '/vaccination-cards', icon: Syringe },
    ...(user?.role === 'admin' ? [{ name: 'Catálogo Vacunas', href: '/vaccines-catalog', icon: Syringe, shortcut: 'F8' }] : []),
    { name: 'Servicios', href: '/services', icon: Scissors, shortcut: 'F9' },
    { name: 'Categorías Servicios', href: '/service-categories', icon: Tag },
    { name: 'Proveedores', href: '/suppliers', icon: Truck, shortcut: 'F3' },
    { name: 'Cuentas por Pagar', href: '/accounts-payable', icon: FileText, shortcut: 'F10' },
    { name: 'Costos', href: '/costs', icon: DollarSign },
    { name: 'Recordatorios', href: '/reminders', icon: Calendar },
    { name: 'Reportes', href: '/reports', icon: BarChart3, shortcut: 'F11' },
    { name: 'Configuración', href: '/settings', icon: Settings, shortcut: 'F12' },
  ];

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar for mobile */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar navigation={navigation} isActive={isActive} onMobileClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar navigation={navigation} isActive={isActive} onMobileClose={() => {}} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <header className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200 shadow-sm">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="BARBER DOG" 
                  className="h-14 w-auto object-contain"
                />
                <span className="text-xl font-bold text-brand-burgundy hidden sm:block">BARBER DOG</span>
              </div>
              <div className="w-full flex md:ml-4">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    className="block w-full h-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-burgundy focus:border-brand-burgundy sm:text-sm transition-all duration-200"
                    placeholder="Buscar..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              {/* Notifications */}
              <button className="btn-ghost p-2 rounded-lg">
                <Bell className="h-5 w-5" />
              </button>

              {/* User dropdown */}
              <div className="relative flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="btn-ghost p-2 rounded-lg"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const Sidebar = ({ navigation, isActive, onMobileClose }) => {
  return (
    <div className="flex flex-col h-full bg-brand-burgundy border-r border-brand-burgundy">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-brand-burgundy shadow-sm">
        <img 
          src="/logo.png" 
          alt="BARBER DOG" 
          className="h-12 w-auto object-contain mr-3"
        />
        <h1 className="text-xl font-bold text-brand-cream tracking-tight">BARBER DOG</h1>
      </div>
      
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onMobileClose}
              className={`sidebar-item ${
                isActive(item.href) ? 'active' : ''
              }`}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.shortcut && (
                <span className="hidden lg:inline-block ml-2 text-xs text-brand-cream opacity-70">
                  {item.shortcut}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

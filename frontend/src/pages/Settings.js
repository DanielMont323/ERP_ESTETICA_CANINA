import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  User,
  Bell,
  Shield,
  Database,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      // API call to change password would go here
      toast.success('Contraseña actualizada correctamente');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Error al actualizar contraseña');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'data', name: 'Datos', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona la configuración del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="card-body">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Información del Perfil</h3>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="text-white text-xl font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{user?.name}</h4>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <p className="text-sm text-gray-500">Rol: {user?.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        defaultValue={user?.name}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <button className="btn btn-primary btn-md">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </button>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Preferencias de Notificación</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Notificaciones de bajo stock</p>
                        <p className="text-sm text-gray-500">Recibir alertas cuando el stock esté por debajo del mínimo</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Recordatorios vencidos</p>
                        <p className="text-sm text-gray-500">Alertas sobre recordatorios que han pasado su fecha</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Cuentas por pagar vencidas</p>
                        <p className="text-sm text-gray-500">Notificaciones sobre pagos vencidos</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Resumen diario</p>
                        <p className="text-sm text-gray-500">Resumen de ventas y actividades del día</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4 text-primary-600" />
                    </label>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Cambiar Contraseña</h3>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="form-label">Contraseña Actual</label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Nueva Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.newPassword}
                          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                          className="form-input pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-md">
                      Actualizar Contraseña
                    </button>
                  </form>
                </div>
              )}

              {/* Data Tab */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Gestión de Datos</h3>
                  
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Exportar Datos</h4>
                      <p className="text-sm text-gray-500 mb-4">Descarga todos tus datos en formato CSV</p>
                      <button className="btn btn-secondary btn-md">
                        <Database className="h-4 w-4 mr-2" />
                        Exportar Datos
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Respaldo de Base de Datos</h4>
                      <p className="text-sm text-gray-500 mb-4">Crea un respaldo completo de la base de datos</p>
                      <button className="btn btn-secondary btn-md">
                        <Database className="h-4 w-4 mr-2" />
                        Crear Respaldo
                      </button>
                    </div>

                    <div className="border border-danger-200 rounded-lg p-4">
                      <h4 className="font-medium text-danger-900 mb-2">Zona de Peligro</h4>
                      <p className="text-sm text-danger-500 mb-4">Estas acciones son irreversibles</p>
                      <button className="btn btn-danger btn-md">
                        Eliminar Todos los Datos
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

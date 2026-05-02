import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2 } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await register(formData.name, formData.email, formData.password);
      } else {
        result = await login(formData.email, formData.password);
      }

      if (result.success) {
        toast.success(isRegister ? 'Usuario registrado correctamente' : 'Bienvenido');
        navigate('/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">ERP System</h1>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegister ? 'Regístrate para acceder al sistema' : 'Ingresa tus credenciales para continuar'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="form-label">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Juan Pérez"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="form-label">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full btn btn-primary btn-md"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isRegister ? 'Registrando...' : 'Iniciando sesión...'}
                </div>
              ) : (
                isRegister ? 'Registrarse' : 'Iniciar sesión'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              {isRegister 
                ? '¿Ya tienes cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Regístrate'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

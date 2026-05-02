import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Pets from './pages/Pets';
import Services from './pages/Services';
import Suppliers from './pages/Suppliers';
import AccountsPayable from './pages/AccountsPayable';
import Costs from './pages/Costs';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Public Route component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="sales" element={<Sales />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="customers" element={<Customers />} />
              <Route path="pets" element={<Pets />} />
              <Route path="services" element={<Services />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="accounts-payable" element={<AccountsPayable />} />
              <Route path="costs" element={<Costs />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const productoRoutes = require('./routes/productos');
const clienteRoutes = require('./routes/clientes');
const mascotaRoutes = require('./routes/mascotas');
const servicioRoutes = require('./routes/servicios');
const ventaRoutes = require('./routes/ventas');
const proveedorRoutes = require('./routes/proveedores');
const compraRoutes = require('./routes/compras');
const cuentaPorPagarRoutes = require('./routes/cuentasPorPagar');
const costoRoutes = require('./routes/costos');
const recordatorioRoutes = require('./routes/recordatorios');
const reportRoutes = require('./routes/reports');
const supplierProductRoutes = require('./routes/supplierProducts');

// Conectar a la base de datos
connectDB();

const app = express();

// Middleware
// CORS configuration for Zeabur and local development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for local development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // In production, Zeabur services communicate via private networking
    // Allow all origins in Zeabur environment (can be restricted further)
    if (process.env.ZEABUR === 'true' || process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    callback(null, true);
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/mascotas', mascotaRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/cuentas-por-pagar', cuentaPorPagarRoutes);
app.use('/api/costos', costoRoutes);
app.use('/api/recordatorios', recordatorioRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/supplier-products', supplierProductRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - serve React app for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Ruta API no encontrada' 
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

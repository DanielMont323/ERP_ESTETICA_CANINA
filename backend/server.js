require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

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
app.use(cors());
app.use(express.json());

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

const mongoose = require('mongoose');

const itemVentaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['producto', 'servicio'],
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: false,
    min: 0
  }
});

const ventaSchema = new mongoose.Schema({
  items: [itemVentaSchema],
  total: {
    type: Number,
    required: false,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia'],
    required: true
  },
  saleChannel: {
    type: String,
    enum: ['local', 'mercado_libre', 'redes_sociales'],
    required: true,
    default: 'local'
  },
  commission: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  netIncome: {
    type: Number,
    required: false,
    min: 0
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente'
  },
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota'
  },
  amountReceived: {
    type: Number,
    min: 0
  },
  change: {
    type: Number,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  },
  status: {
    type: String,
    enum: ['completada', 'cancelada', 'pendiente'],
    default: 'completada'
  },
  notes: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Calcular totales antes de guardar
ventaSchema.pre('save', function(next) {
  // Calcular subtotal de cada item
  this.items.forEach(item => {
    item.subtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
  });
  
  // Calcular total
  this.total = Math.round(this.items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  
  // Calcular comisión (10% del total) - redondeado a 2 decimales
  this.commission = Math.round((this.total * 0.1) * 100) / 100;
  
  // Calcular ingreso neto
  this.netIncome = Math.round((this.total - this.commission) * 100) / 100;
  
  next();
});

// Índices para mejorar rendimiento
ventaSchema.index({ mascota: 1 });
ventaSchema.index({ customer: 1 });
ventaSchema.index({ date: -1 });

module.exports = mongoose.model('Venta', ventaSchema);

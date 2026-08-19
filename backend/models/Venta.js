const mongoose = require('mongoose');
const { getCurrentDateGMT7 } = require('../helpers/timezone');

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
  },
  nextDoseDate: {
    type: Date
  },
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota'
  }
});

const ventaSchema = new mongoose.Schema({
  items: [itemVentaSchema],
  subtotal: {
    type: Number,
    required: false,
    min: 0
  },
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
    required: false,
    min: 0,
    default: 0
  },
  cardCommission: {
    type: Number,
    required: false,
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
    default: getCurrentDateGMT7
  }
});

// Calcular totales antes de guardar
ventaSchema.pre('save', function(next) {
  // Calcular subtotal de cada item
  this.items.forEach(item => {
    item.subtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
  });
  
  // Calcular subtotal total
  this.subtotal = Math.round(this.items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  
  // Calcular comisión de tarjeta (4.6%) solo si paymentMethod es tarjeta
  if (this.paymentMethod === 'tarjeta') {
    this.cardCommission = Math.round((this.subtotal * 0.046) * 100) / 100;
  } else {
    this.cardCommission = 0;
  }
  
  // Calcular total (subtotal + comisión de tarjeta)
  this.total = Math.round((this.subtotal + this.cardCommission) * 100) / 100;
  
  // Calcular ingreso neto (total - commission - cardCommission)
  // Nota: commission ahora es un campo manual para uso administrativo
  this.netIncome = Math.round((this.total - (this.commission || 0) - this.cardCommission) * 100) / 100;
  
  next();
});

// Índices para mejorar rendimiento
ventaSchema.index({ mascota: 1 });
ventaSchema.index({ customer: 1 });
ventaSchema.index({ date: -1 });

module.exports = mongoose.model('Venta', ventaSchema);

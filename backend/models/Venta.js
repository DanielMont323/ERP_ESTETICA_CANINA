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
    item.subtotal = item.quantity * item.unitPrice;
  });
  
  // Calcular total
  this.total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calcular comisión (10% del total)
  this.commission = this.total * 0.1;
  
  // Calcular ingreso neto
  this.netIncome = this.total - this.commission;
  
  next();
});

module.exports = mongoose.model('Venta', ventaSchema);

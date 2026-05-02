const mongoose = require('mongoose');

const itemCompraSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  baseUnitCost: {
    type: Number,
    required: true,
    min: 0
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  discountDays: {
    type: Number,
    min: 0,
    default: 0
  },
  discountApplied: {
    type: Boolean,
    default: false
  },
  subtotal: {
    type: Number,
    required: false,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  }
});

const compraSchema = new mongoose.Schema({
  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: true
  },
  items: [itemCompraSchema],
  total: {
    type: Number,
    required: false,
    min: 0
  },
  baseTotal: {
    type: Number,
    required: false,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountDeadline: {
    type: Date
  },
  type: {
    type: String,
    enum: ['contado', 'credito'],
    required: true
  },
  dueDate: {
    type: Date,
    required: function() {
      return this.type === 'credito';
    }
  },
  status: {
    type: String,
    enum: ['pendiente', 'pagada', 'vencida'],
    default: function() {
      return this.type === 'contado' ? 'pagada' : 'pendiente';
    }
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta'],
    required: function() {
      return this.type === 'contado';
    }
  },
  invoice: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Calcular totales antes de guardar
compraSchema.pre('save', function(next) {
  // Calcular subtotal y descuentos de cada item
  let baseTotal = 0;
  let totalDiscount = 0;
  
  this.items.forEach(item => {
    // Calcular subtotal base (sin descuento)
    const baseSubtotal = item.quantity * item.baseUnitCost;
    
    // Calcular descuento si aplica
    let discountAmount = 0;
    if (item.discountPercentage > 0 && !item.discountApplied) {
      discountAmount = baseSubtotal * (item.discountPercentage / 100);
    }
    
    // Calcular subtotal final
    item.subtotal = baseSubtotal - discountAmount;
    item.discountAmount = discountAmount;
    
    baseTotal += baseSubtotal;
    totalDiscount += discountAmount;
  });
  
  // Establecer totales
  this.baseTotal = baseTotal;
  this.totalDiscount = totalDiscount;
  this.total = baseTotal - totalDiscount;
  
  // Establecer fecha límite de descuento
  if (this.items.some(item => item.discountDays > 0)) {
    const maxDiscountDays = Math.max(...this.items.map(item => item.discountDays));
    this.discountDeadline = new Date(this.date);
    this.discountDeadline.setDate(this.discountDeadline.getDate() + maxDiscountDays);
  }
  
  // Establecer fecha de vencimiento para compras a crédito
  if (this.type === 'credito' && !this.dueDate) {
    this.dueDate = new Date();
    this.dueDate.setDate(this.dueDate.getDate() + 30); // 30 días por defecto
  }
  
  next();
});

// Actualizar estado a vencido si pasa la fecha
compraSchema.methods.checkDueDate = function() {
  if (this.type === 'credito' && this.status === 'pendiente' && new Date() > this.dueDate) {
    this.status = 'vencida';
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Compra', compraSchema);

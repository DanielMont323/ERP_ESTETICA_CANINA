const mongoose = require('mongoose');
const { getCurrentDateGMT7 } = require('../helpers/timezone');

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
  earlyPaymentDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
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
    enum: ['pendiente', 'pagada', 'vencida', 'cancelada'],
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
    default: getCurrentDateGMT7
  }
});

// Calcular totales antes de guardar
compraSchema.pre('save', async function(next) {
  // Calcular subtotal y descuentos de cada item
  let baseTotal = 0;
  let totalDiscount = 0;
  
  this.items.forEach(item => {
    // Calcular subtotal base (sin descuento)
    const baseSubtotal = item.quantity * item.baseUnitCost;
    
    // Calcular descuento si aplica (solo descuento por item, no por pronto pago)
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
  
  // Establecer totales base
  this.baseTotal = baseTotal;
  
  // Aplicar descuento por pronto pago del proveedor si es crédito
  if (this.type === 'credito' && this.earlyPaymentDiscount > 0) {
    const earlyPaymentDiscountAmount = baseTotal * (this.earlyPaymentDiscount / 100);
    this.totalDiscount = totalDiscount + earlyPaymentDiscountAmount;
    this.total = baseTotal - this.totalDiscount;
  } else {
    this.totalDiscount = totalDiscount;
    this.total = baseTotal - totalDiscount;
  }
  
  // Establecer fecha límite de descuento (ya viene del backend si es crédito)
  // No recalcular aquí porque ya se establece en el endpoint
  
  // Establecer fecha de vencimiento para compras a crédito usando creditDays del proveedor
  if (this.type === 'credito' && !this.dueDate && this.proveedor) {
    try {
      const Proveedor = require('./Proveedor');
      const proveedor = await Proveedor.findById(this.proveedor);
      if (proveedor && proveedor.creditDays > 0) {
        const { getCurrentDateGMT7 } = require('../helpers/timezone');
        const purchaseDate = getCurrentDateGMT7();
        this.dueDate = new Date(purchaseDate);
        this.dueDate.setDate(this.dueDate.getDate() + proveedor.creditDays);
      } else {
        // Fallback a 30 días si no tiene creditDays configurado
        const { getCurrentDateGMT7 } = require('../helpers/timezone');
        const purchaseDate = getCurrentDateGMT7();
        this.dueDate = new Date(purchaseDate);
        this.dueDate.setDate(this.dueDate.getDate() + 30);
      }
    } catch (error) {
      // Si hay error al obtener proveedor, usar 30 días por defecto
      const { getCurrentDateGMT7 } = require('../helpers/timezone');
      const purchaseDate = getCurrentDateGMT7();
      this.dueDate = new Date(purchaseDate);
      this.dueDate.setDate(this.dueDate.getDate() + 30);
    }
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

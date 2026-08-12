const mongoose = require('mongoose');
const { getCurrentDateGMT7 } = require('../helpers/timezone');

const cuentaPorPagarSchema = new mongoose.Schema({
  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: true
  },
  compra: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Compra',
    required: true
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  hasIVA: {
    type: Boolean,
    default: false
  },
  ivaRate: {
    type: Number,
    default: 0.16,
    min: 0,
    max: 1
  },
  subtotal: {
    type: Number,
    required: false,
    min: 0
  },
  ivaAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  montoBase: {
    type: Number,
    required: true,
    min: 0
  },
  descuentoDisponible: {
    type: Number,
    default: 0,
    min: 0
  },
  discountDeadline: {
    type: Date
  },
  descuentoAplicado: {
    type: Boolean,
    default: false
  },
  ahorroRealizado: {
    type: Number,
    default: 0,
    min: 0
  },
  saldo: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pendiente', 'pagado', 'vencido'],
    default: 'pendiente'
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: getCurrentDateGMT7
    },
    paymentMethod: {
      type: String,
      enum: ['efectivo', 'transferencia', 'tarjeta'],
      required: true
    },
    notes: {
      type: String,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: getCurrentDateGMT7
  }
});

// Pre-save hook para calcular IVA automáticamente
cuentaPorPagarSchema.pre('save', function(next) {
  // Solo recalcular si el monto no está establecido o si es una nueva cuenta sin IVA explícito
  const isNew = this.isNew;
  
  // Si es una actualización y ya tiene monto establecido, no recalcular
  if (!isNew && this.monto > 0) {
    return next();
  }
  
  // Calcular IVA si aplica
  if (this.hasIVA) {
    // Usar subtotal o montoBase como fallback para cuentas antiguas
    const baseAmount = this.subtotal || this.montoBase || this.monto;
    if (baseAmount) {
      this.ivaAmount = Math.round((baseAmount * this.ivaRate) * 100) / 100;
      this.monto = Math.round((baseAmount + this.ivaAmount) * 100) / 100;
    }
  } else {
    this.ivaAmount = 0;
    // Usar subtotal o montoBase como fallback
    const baseAmount = this.subtotal || this.montoBase;
    if (baseAmount) {
      this.monto = baseAmount;
    }
  }
  
  // Si montoBase no está establecido, usar el subtotal o monto
  if (!this.montoBase || this.montoBase === 0) {
    this.montoBase = this.subtotal || this.monto;
  }
  
  next();
});

// Actualizar estado a vencido si pasa la fecha
cuentaPorPagarSchema.methods.checkDueDate = function() {
  if (this.status === 'pendiente' && new Date() > this.dueDate) {
    this.status = 'vencido';
    return this.save();
  }
  return Promise.resolve(this);
};

// Registrar pago
cuentaPorPagarSchema.methods.addPayment = function(amount, paymentMethod, user, notes) {
  const currentDate = new Date();
  
  // Calcular el importe exigible (monto que realmente se debe pagar)
  let importeExigible = this.montoBase;
  let discountAvailable = false;
  
  // Verificar si el descuento está disponible
  if (this.discountDeadline && 
      currentDate <= this.discountDeadline && 
      this.descuentoDisponible > 0 && 
      !this.descuentoAplicado) {
    discountAvailable = true;
    importeExigible = this.montoBase - this.descuentoDisponible;
  }
  
  // Calcular pagos anteriores
  const pagosAnteriores = this.payments.reduce((sum, pago) => sum + (pago.amount || 0), 0);
  
  // Calcular saldo actual basado en el importe exigible
  let saldoActual = importeExigible - pagosAnteriores;
  if (saldoActual < 0) saldoActual = 0;
  
  // Validar que el pago no exceda el saldo
  if (amount > saldoActual) {
    throw new Error(`El pago excede el saldo pendiente. Saldo: ${saldoActual}, Pago: ${amount}`);
  }
  
  // Calcular nuevo saldo
  const nuevoSaldo = saldoActual - amount;
  
  // Si el descuento está disponible y es el primer pago, marcarlo como aplicado
  if (discountAvailable && !this.descuentoAplicado) {
    this.descuentoAplicado = true;
    this.ahorroRealizado = this.descuentoDisponible;
  }
  
  // Actualizar saldo
  this.saldo = nuevoSaldo;
  
  // Actualizar monto total si se aplicó descuento
  if (this.descuentoAplicado) {
    this.monto = this.montoBase - this.descuentoDisponible;
  }
  
  // Registrar el pago
  this.payments.push({
    amount: amount,
    originalAmount: amount,
    discountAmount: discountAvailable ? this.descuentoDisponible : 0,
    paymentMethod,
    notes,
    user
  });
  
  // Actualizar estado si el saldo es 0
  if (this.saldo <= 0) {
    this.status = 'pagado';
    this.saldo = 0;
  }
  
  return this.save();
};

// Verificar si el descuento sigue disponible
cuentaPorPagarSchema.methods.checkDiscountAvailability = function() {
  if (!this.discountDeadline || this.descuentoAplicado) {
    return {
      available: false,
      reason: this.descuentoAplicado ? 'Ya aplicado' : 'Sin descuento'
    };
  }

  const currentDate = new Date();
  const available = currentDate <= this.discountDeadline;
  const daysRemaining = Math.ceil((this.discountDeadline - currentDate) / (1000 * 60 * 60 * 24));

  return {
    available,
    daysRemaining: Math.max(0, daysRemaining),
    discountAmount: this.descuentoDisponible,
    finalAmount: this.montoBase - this.descuentoDisponible
  };
};

module.exports = mongoose.model('CuentaPorPagar', cuentaPorPagarSchema);

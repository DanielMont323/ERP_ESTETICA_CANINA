const mongoose = require('mongoose');

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
      default: Date.now
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
    default: Date.now
  }
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
  let finalAmount = amount;
  let discountApplied = false;
  let savings = 0;

  // Aplicar descuento si está dentro del plazo y no se ha aplicado aún
  if (this.discountDeadline && 
      currentDate <= this.discountDeadline && 
      this.descuentoDisponible > 0 && 
      !this.descuentoAplicado) {
    
    // Calcular proporción del descuento basado en el monto del pago
    const discountProportion = amount / this.saldo;
    const discountAmount = this.descuentoDisponible * discountProportion;
    
    finalAmount = amount - discountAmount;
    savings = discountAmount;
    discountApplied = true;
    
    // Actualizar estado de descuento
    this.descuentoAplicado = true;
    this.ahorroRealizado += savings;
    
    // Si es pago completo, actualizar el monto total
    if (amount >= this.saldo) {
      this.monto = this.montoBase - this.descuentoDisponible;
      this.saldo = this.montoBase - this.descuentoDisponible - (amount - savings);
    } else {
      this.saldo -= finalAmount;
    }
  } else {
    this.saldo -= amount;
  }

  this.payments.push({
    amount: finalAmount,
    originalAmount: amount,
    discountAmount: savings,
    paymentMethod,
    notes,
    user
  });
  
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

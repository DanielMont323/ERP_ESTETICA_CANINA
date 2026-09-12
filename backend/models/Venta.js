const mongoose = require('mongoose');
const { getCurrentDateGMT7 } = require('../helpers/timezone');

const aplicacionSchema = new mongoose.Schema({
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota'
  },
  fechaAplicacion: {
    type: Date
  },
  proximaDosis: {
    type: Date
  }
});

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
  discountType: {
    type: String,
    enum: ['ninguno', 'porcentaje', 'monto'],
    default: 'ninguno'
  },
  discountValue: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotalBeforeDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotalAfterDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  nextDoseDate: {
    type: Date
  },
  diasProximaDosis: {
    type: Number,
    min: 0
  },
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota'
  },
  aplicaciones: [aplicacionSchema]
});

const ventaSchema = new mongoose.Schema({
  items: [itemVentaSchema],
  subtotal: {
    type: Number,
    required: false,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  employeeDiscountApplied: {
    type: Boolean,
    default: false
  },
  employeeDiscountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  employeeDiscountAmount: {
    type: Number,
    default: 0,
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
    required: false
  },
  payments: [{
    method: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'transferencia'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  saleChannel: {
    type: String,
    enum: ['local', 'mercado_libre', 'redes_sociales'],
    required: true,
    default: 'local'
  },
  manualFinancials: {
    type: Boolean,
    default: false
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
  // Solo recalcular si NO es Mercado Libre con ajuste manual
  const isMercadoLibreManual = this.saleChannel === 'mercado_libre' && this.manualFinancials === true;
  
  if (!isMercadoLibreManual) {
    // Calcular subtotal de cada item y aplicar descuentos
    this.items.forEach(item => {
      const itemSubtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
      item.subtotal = itemSubtotal;
      
      // Valores por defecto para compatibilidad con ventas antiguas
      item.discountType = item.discountType || 'ninguno';
      item.discountValue = item.discountValue || 0;
      item.discountAmount = item.discountAmount || 0;
      item.subtotalBeforeDiscount = item.subtotalBeforeDiscount || itemSubtotal;
      item.subtotalAfterDiscount = item.subtotalAfterDiscount || itemSubtotal;
      
      // Calcular descuento por item
      if (item.discountType === 'porcentaje') {
        // Validar porcentaje
        const percentage = Math.min(Math.max(item.discountValue || 0, 0), 100);
        item.discountAmount = Math.round((itemSubtotal * (percentage / 100)) * 100) / 100;
      } else if (item.discountType === 'monto') {
        // Validar monto no exceda subtotal
        const discountAmount = Math.min(item.discountValue || 0, itemSubtotal);
        item.discountAmount = Math.round(discountAmount * 100) / 100;
      } else {
        item.discountAmount = 0;
      }
      
      // Actualizar valores de subtotal
      item.subtotalBeforeDiscount = itemSubtotal;
      item.subtotalAfterDiscount = Math.round((itemSubtotal - item.discountAmount) * 100) / 100;
    });
    
    // Calcular subtotal total (suma de subtotalBeforeDiscount)
    this.subtotal = Math.round(this.items.reduce((sum, item) => sum + (item.subtotalBeforeDiscount || 0), 0) * 100) / 100;
    
    // Calcular descuento de empleado si está activo
    if (this.employeeDiscountApplied === true) {
      // Validar que sea 20%
      if (this.employeeDiscountPercentage !== 20) {
        this.employeeDiscountPercentage = 20;
      }
      
      // Calcular descuento de empleado (20% del subtotal)
      this.employeeDiscountAmount = Math.round((this.subtotal * 0.20) * 100) / 100;
      
      // totalDiscount es el descuento de empleado
      this.totalDiscount = this.employeeDiscountAmount;
      
      // Eliminar descuentos individuales de items
      this.items.forEach(item => {
        item.discountType = 'ninguno';
        item.discountValue = 0;
        item.discountAmount = 0;
        item.subtotalAfterDiscount = item.subtotalBeforeDiscount;
      });
    } else {
      // No hay descuento de empleado
      this.employeeDiscountPercentage = 0;
      this.employeeDiscountAmount = 0;
      
      // Calcular totalDiscount como suma de descuentos individuales
      this.totalDiscount = Math.round(this.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0) * 100) / 100;
    }
    
    // Calcular total (subtotal - totalDiscount)
    this.total = Math.round((this.subtotal - this.totalDiscount) * 100) / 100;
    
    // Calcular comisión de tarjeta basado en payments[]
    if (this.payments && this.payments.length > 0) {
      // Sumar todos los pagos con tarjeta
      const totalCardPayment = this.payments
        .filter(p => p.method === 'tarjeta')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      this.cardCommission = Math.round((totalCardPayment * 0.0406) * 100) / 100;
    } else {
      // Fallback para ventas antiguas sin payments[]
      if (this.paymentMethod === 'tarjeta') {
        this.cardCommission = Math.round((this.total * 0.0406) * 100) / 100;
      } else {
        this.cardCommission = 0;
      }
    }
  }
  
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

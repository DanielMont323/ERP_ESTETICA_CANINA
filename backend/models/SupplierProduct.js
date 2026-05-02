const mongoose = require('mongoose');

const supplierProductSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  baseCost: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  discountDays: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar rendimiento
supplierProductSchema.index({ supplier: 1, product: 1 }, { unique: true });
supplierProductSchema.index({ product: 1 });

// Virtual para calcular el costo con descuento
supplierProductSchema.virtual('discountedCost').get(function() {
  if (this.discountPercentage === 0) {
    return this.baseCost;
  }
  return this.baseCost * (1 - (this.discountPercentage / 100));
});

// Virtual para calcular el ahorro
supplierProductSchema.virtual('savings').get(function() {
  if (this.discountPercentage === 0) {
    return 0;
  }
  return this.baseCost * (this.discountPercentage / 100);
});

// Middleware para actualizar updatedAt
supplierProductSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SupplierProduct', supplierProductSchema);

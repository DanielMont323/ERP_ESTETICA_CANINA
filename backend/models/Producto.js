const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    enum: ['alimentos', 'accesorios', 'medicamentos', 'juguetes', 'higiene', 'otros']
  },
  cost: {
    type: Number,
    required: [true, 'El costo es obligatorio'],
    min: 0
  },
  price: {
    type: Number,
    required: [true, 'El precio de venta es obligatorio'],
    min: 0
  },
  stock: {
    type: Number,
    required: [true, 'El stock es obligatorio'],
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    default: 5,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'PRD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
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

// Calcular margen de ganancia
productoSchema.virtual('margin').get(function() {
  if (this.price > 0) {
    return ((this.price - this.cost) / this.price * 100).toFixed(2);
  }
  return 0;
});

// Actualizar updatedAt antes de guardar
productoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Producto', productoSchema);

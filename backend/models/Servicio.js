const mongoose = require('mongoose');

const insumoServicioSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 0
  }
});

const servicioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del servicio es obligatorio'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'El precio del servicio es obligatorio'],
    min: 0
  },
  duration: {
    type: Number,
    required: [true, 'La duración es obligatoria'],
    min: 1
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoriaServicio',
    required: [true, 'La categoría es obligatoria']
  },
  insumos: [insumoServicioSchema],
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Servicio', servicioSchema);

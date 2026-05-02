const mongoose = require('mongoose');

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
    type: String,
    enum: ['baño', 'corte', 'consulta', 'vacunación', 'desparasitación', 'estética', 'otros'],
    required: [true, 'La categoría es obligatoria']
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

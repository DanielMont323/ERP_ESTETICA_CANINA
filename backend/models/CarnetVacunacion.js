const mongoose = require('mongoose');
const { getCurrentDateGMT7 } = require('../helpers/timezone');

const vacunaSchema = new mongoose.Schema({
  // Compatibilidad: acepta ObjectId (nuevo) o String (histórico)
  vacuna: {
    type: mongoose.Schema.Types.Mixed, // ObjectId o String
    required: true
  },
  nombre: {
    type: String,
    trim: true
  },
  fecha: {
    type: Date,
    required: true
  },
  proximaDosis: {
    type: Date
  },
  diasProximaDosis: {
    type: Number,
    min: 0
  },
  observaciones: {
    type: String,
    trim: true
  },
  venta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venta'
  }
});

const carnetVacunacionSchema = new mongoose.Schema({
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota',
    required: true,
    unique: true
  },
  nombreMascota: {
    type: String,
    required: true
  },
  especie: {
    type: String,
    required: true
  },
  raza: {
    type: String,
    required: true
  },
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  nombrePropietario: {
    type: String,
    required: true
  },
  vacunas: [vacunaSchema],
  createdAt: {
    type: Date,
    default: getCurrentDateGMT7
  },
  updatedAt: {
    type: Date,
    default: getCurrentDateGMT7
  }
});

// Actualizar updatedAt antes de guardar
carnetVacunacionSchema.pre('save', function(next) {
  this.updatedAt = getCurrentDateGMT7();
  next();
});

module.exports = mongoose.model('CarnetVacunacion', carnetVacunacionSchema);

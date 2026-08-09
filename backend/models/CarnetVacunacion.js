const mongoose = require('mongoose');

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
  observaciones: {
    type: String,
    trim: true
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
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
carnetVacunacionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CarnetVacunacion', carnetVacunacionSchema);

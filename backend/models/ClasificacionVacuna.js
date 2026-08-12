const mongoose = require('mongoose');

const clasificacionVacunaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la clasificación es obligatorio'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
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

// Actualizar updatedAt antes de guardar
clasificacionVacunaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ClasificacionVacuna', clasificacionVacunaSchema);

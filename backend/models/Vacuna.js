const mongoose = require('mongoose');

const vacunaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la vacuna es obligatorio'],
    unique: true,
    trim: true
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
vacunaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Vacuna', vacunaSchema);

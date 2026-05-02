const mongoose = require('mongoose');

const recordatorioSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'La fecha es obligatoria']
  },
  type: {
    type: String,
    enum: ['pago', 'vacuna', 'consulta', 'cita', 'inventario', 'mantenimiento', 'otro'],
    required: [true, 'El tipo es obligatorio']
  },
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  relatedModel: {
    type: String,
    enum: ['Cliente', 'Mascota', 'Proveedor', 'CuentaPorPagar', 'Costo'],
    required: false
  },
  status: {
    type: String,
    enum: ['pendiente', 'completado', 'cancelado'],
    default: 'pendiente'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Marcar como completado
recordatorioSchema.methods.complete = function() {
  this.status = 'completado';
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Recordatorio', recordatorioSchema);

const mongoose = require('mongoose');

const costoSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true
  },
  type: {
    type: String,
    enum: ['fijo', 'variable'],
    required: [true, 'El tipo de costo es obligatorio']
  },
  amount: {
    type: Number,
    required: [true, 'El monto es obligatorio'],
    min: 0
  },
  category: {
    type: String,
    enum: ['renta', 'servicios', 'nomina', 'materiales', 'marketing', 'mantenimiento', 'impuestos', 'otros'],
    required: [true, 'La categoría es obligatoria']
  },
  date: {
    type: Date,
    required: [true, 'La fecha es obligatoria']
  },
  frequency: {
    type: String,
    enum: ['único', 'mensual', 'anual'],
    default: 'único'
  },
  nextDueDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calcular próxima fecha de pago para costos recurrentes
costoSchema.pre('save', function(next) {
  if (this.frequency === 'mensual') {
    const nextDate = new Date(this.date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    this.nextDueDate = nextDate;
  } else if (this.frequency === 'anual') {
    const nextDate = new Date(this.date);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    this.nextDueDate = nextDate;
  }
  
  next();
});

module.exports = mongoose.model('Costo', costoSchema);

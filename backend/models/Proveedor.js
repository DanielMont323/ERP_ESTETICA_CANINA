const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del proveedor es obligatorio'],
    trim: true
  },
  contact: {
    type: String,
    required: [true, 'El contacto es obligatorio'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    validate: {
      validator: function(phone) {
        return /^\d{10}$/.test(phone);
      },
      message: 'El teléfono debe tener 10 dígitos'
    }
  },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: function(email) {
        return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Por favor ingresa un email válido'
    }
  },
  address: {
    type: String,
    trim: true
  },
  creditDays: {
    type: Number,
    required: [true, 'Los días de crédito son obligatorios'],
    min: 0,
    default: 0
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0
  },
  currentDebt: {
    type: Number,
    min: 0,
    default: 0
  },
  rfc: {
    type: String,
    trim: true,
    uppercase: true
  },
  notes: {
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
  }
});

// Calcular crédito disponible
proveedorSchema.virtual('availableCredit').get(function() {
  return this.creditLimit - this.currentDebt;
});

module.exports = mongoose.model('Proveedor', proveedorSchema);

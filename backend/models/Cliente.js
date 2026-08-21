const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio'],
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
  notes: {
    type: String,
    trim: true
  },
  purchaseHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venta'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual para contar mascotas activas
clienteSchema.virtual('petCount').get(async function() {
  const Mascota = require('./Mascota');
  const count = await Mascota.countDocuments({ owner: this._id, isActive: true });
  return count;
});

module.exports = mongoose.model('Cliente', clienteSchema);

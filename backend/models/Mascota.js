const mongoose = require('mongoose');

const mascotaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la mascota es obligatorio'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'El tipo de mascota es obligatorio'],
    enum: ['perro', 'gato', 'ave', 'roedor', 'reptil', 'otro']
  },
  breed: {
    type: String,
    required: [true, 'La raza es obligatoria'],
    trim: true
  },
  birthDate: {
    type: Date,
    required: [true, 'La fecha de nacimiento es obligatoria']
  },
  weight: {
    type: Number,
    required: [true, 'El peso es obligatorio'],
    min: 0
  },
  gender: {
    type: String,
    enum: ['macho', 'hembra'],
    required: [true, 'El sexo es obligatorio']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: false
  },
  medicalHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      required: true
    },
    veterinarian: {
      type: String,
      trim: true
    },
    cost: {
      type: Number,
      min: 0
    }
  }],
  vaccinations: [{
    name: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    nextDueDate: {
      type: Date
    },
    veterinarian: {
      type: String,
      trim: true
    }
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

// Calcular edad
mascotaSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

module.exports = mongoose.model('Mascota', mascotaSchema);

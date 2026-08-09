const express = require('express');
const CarnetVacunacion = require('../models/CarnetVacunacion');
const Mascota = require('../models/Mascota');
const Vacuna = require('../models/Vacuna');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/carnet-vacunacion
// @desc    Obtener todos los carnets de vacunación
router.get('/', authenticateToken, async (req, res) => {
  try {
    const carnets = await CarnetVacunacion.find()
      .populate('mascota', 'name type breed birthDate')
      .populate('propietario', 'name phone email')
      .sort({ nombreMascota: 1 });

    // Populate manual de vacunas para manejar ObjectId y String
    for (const carnet of carnets) {
      for (const vacuna of carnet.vacunas) {
        if (vacuna.vacuna && mongoose.Types.ObjectId.isValid(vacuna.vacuna)) {
          // Si es ObjectId, populate
          const vacunaDoc = await Vacuna.findById(vacuna.vacuna).select('name description');
          vacuna.vacuna = vacunaDoc;
        }
        // Si es String, mantener como está (histórico)
      }
    }

    res.json({
      success: true,
      data: carnets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carnets de vacunación'
    });
  }
});

// @route   GET /api/carnet-vacunacion/mascota/:mascotaId
// @desc    Obtener carnet por ID de mascota
router.get('/mascota/:mascotaId', async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.findOne({ mascota: req.params.mascotaId })
      .populate('mascota', 'name type breed birthDate')
      .populate('propietario', 'name phone email');
    
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: carnet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carnet'
    });
  }
});

// @route   GET /api/carnet-vacunacion/:id
// @desc    Obtener carnet de vacunación por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.findById(req.params.id)
      .populate('mascota', 'name type breed birthDate')
      .populate('propietario', 'name phone email');
    
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: carnet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carnet'
    });
  }
});

// @route   POST /api/carnet-vacunacion
// @desc    Crear nuevo carnet de vacunación
router.post('/', authenticateToken, async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.create(req.body);
    
    res.status(201).json({
      success: true,
      data: carnet,
      message: 'Carnet creado correctamente'
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear carnet'
    });
  }
});

// @route   PUT /api/carnet-vacunacion/:id
// @desc    Actualizar carnet de vacunación
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: carnet,
      message: 'Carnet actualizado correctamente'
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar carnet'
    });
  }
});

// @route   POST /api/carnet-vacunacion/:id/vacunas
// @desc    Agregar vacuna al carnet
router.post('/:id/vacunas', authenticateToken, async (req, res) => {
  try {
    console.log('req.body completo:', req.body);
    
    const { vacuna, fecha, proximaDosis, observaciones } = req.body;
    
    console.log('Datos recibidos:', { vacuna, fecha, proximaDosis, observaciones });
    
    const carnet = await CarnetVacunacion.findById(req.params.id);
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }

    // Validar que se proporcione vacuna
    if (!vacuna) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar una vacuna del catálogo'
      });
    }

    // Si se proporciona vacuna (del catálogo), obtener nombre
    let nombreFinal = '';

    if (mongoose.Types.ObjectId.isValid(vacuna)) {
      // Obtener nombre del catálogo
      const vacunaDoc = await Vacuna.findById(vacuna);
      if (vacunaDoc) {
        nombreFinal = vacunaDoc.name;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Vacuna no encontrada en el catálogo'
        });
      }
    }

    const nuevaVacuna = {
      vacuna,
      nombre: nombreFinal,
      fecha,
      proximaDosis,
      observaciones
    };

    console.log('Nueva vacuna a guardar:', nuevaVacuna);

    carnet.vacunas.push(nuevaVacuna);
    await carnet.save();

    // Populate para respuesta
    if (mongoose.Types.ObjectId.isValid(vacuna)) {
      const vacunaDoc = await Vacuna.findById(vacuna).select('name description');
      nuevaVacuna.vacuna = vacunaDoc;
    }

    res.json({
      success: true,
      data: nuevaVacuna,
      message: 'Vacuna agregada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar vacuna'
    });
  }
});

// @route   DELETE /api/carnet-vacunacion/:id/vacunas/:vacunaId
// @desc    Eliminar vacuna del carnet
router.delete('/:id/vacunas/:vacunaId', authenticateToken, async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.findById(req.params.id);
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }

    carnet.vacunas = carnet.vacunas.filter(v => v._id.toString() !== req.params.vacunaId);
    await carnet.save();

    res.json({
      success: true,
      message: 'Vacuna eliminada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar vacuna'
    });
  }
});

module.exports = router;

const express = require('express');
const CarnetVacunacion = require('../models/CarnetVacunacion');
const Mascota = require('../models/Mascota');
const router = express.Router();

// @route   GET /api/carnet-vacunacion
// @desc    Obtener todos los carnets de vacunación
router.get('/', async (req, res) => {
  try {
    const carnets = await CarnetVacunacion.find()
      .populate('mascota', 'name type breed birthDate')
      .populate('propietario', 'name phone email')
      .sort({ nombreMascota: 1 });

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
// @desc    Obtener carnet por ID
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.post('/:id/vacunas', async (req, res) => {
  try {
    const { nombre, fecha, proximaDosis, observaciones } = req.body;
    
    const carnet = await CarnetVacunacion.findById(req.params.id);
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }

    carnet.vacunas.push({
      nombre,
      fecha,
      proximaDosis,
      observaciones
    });

    await carnet.save();

    res.json({
      success: true,
      data: carnet,
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
router.delete('/:id/vacunas/:vacunaId', async (req, res) => {
  try {
    const carnet = await CarnetVacunacion.findById(req.params.id);
    if (!carnet) {
      return res.status(404).json({
        success: false,
        message: 'Carnet no encontrado'
      });
    }

    carnet.vacunas = carnet.vacunas.filter(
      vacuna => vacuna._id.toString() !== req.params.vacunaId
    );

    await carnet.save();

    res.json({
      success: true,
      data: carnet,
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

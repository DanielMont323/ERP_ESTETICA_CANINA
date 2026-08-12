const express = require('express');
const ClasificacionVacuna = require('../models/ClasificacionVacuna');
const router = express.Router();

// @route   GET /api/clasificaciones-vacunas
// @desc    Obtener todas las clasificaciones de vacunas
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    let query = {};
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const clasificaciones = await ClasificacionVacuna.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      data: clasificaciones
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clasificaciones de vacunas'
    });
  }
});

// @route   GET /api/clasificaciones-vacunas/:id
// @desc    Obtener clasificación de vacuna por ID
router.get('/:id', async (req, res) => {
  try {
    const clasificacion = await ClasificacionVacuna.findById(req.params.id);
    
    if (!clasificacion) {
      return res.status(404).json({
        success: false,
        message: 'Clasificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: clasificacion
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clasificación de vacuna'
    });
  }
});

// @route   POST /api/clasificaciones-vacunas
// @desc    Crear nueva clasificación de vacuna
router.post('/', async (req, res) => {
  try {
    const clasificacion = await ClasificacionVacuna.create(req.body);
    
    res.status(201).json({
      success: true,
      data: clasificacion,
      message: 'Clasificación de vacuna creada correctamente'
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una clasificación con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear clasificación de vacuna'
    });
  }
});

// @route   PUT /api/clasificaciones-vacunas/:id
// @desc    Actualizar clasificación de vacuna
router.put('/:id', async (req, res) => {
  try {
    const clasificacion = await ClasificacionVacuna.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!clasificacion) {
      return res.status(404).json({
        success: false,
        message: 'Clasificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: clasificacion,
      message: 'Clasificación actualizada correctamente'
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una clasificación con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar clasificación de vacuna'
    });
  }
});

// @route   DELETE /api/clasificaciones-vacunas/:id
// @desc    Eliminar clasificación de vacuna
router.delete('/:id', async (req, res) => {
  try {
    const clasificacion = await ClasificacionVacuna.findByIdAndDelete(req.params.id);
    
    if (!clasificacion) {
      return res.status(404).json({
        success: false,
        message: 'Clasificación no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Clasificación eliminada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar clasificación de vacuna'
    });
  }
});

module.exports = router;

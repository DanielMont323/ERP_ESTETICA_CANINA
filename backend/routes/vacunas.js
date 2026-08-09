const express = require('express');
const Vacuna = require('../models/Vacuna');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/vacunas
// @desc    Obtener todas las vacunas (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { active } = req.query;
    let query = {};
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const vacunas = await Vacuna.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: vacunas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacunas'
    });
  }
});

// @route   GET /api/vacunas/active
// @desc    Obtener vacunas activas (para selector en carnet)
router.get('/active', async (req, res) => {
  try {
    const vacunas = await Vacuna.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      data: vacunas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacunas activas'
    });
  }
});

// @route   GET /api/vacunas/:id
// @desc    Obtener vacuna por ID (solo admin)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.findById(req.params.id);
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacuna'
    });
  }
});

// @route   POST /api/vacunas
// @desc    Crear nueva vacuna (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.create(req.body);
    
    res.status(201).json({
      success: true,
      data: vacuna,
      message: 'Vacuna creada correctamente'
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
        message: 'Ya existe una vacuna con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear vacuna'
    });
  }
});

// @route   PUT /api/vacunas/:id
// @desc    Actualizar vacuna (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna,
      message: 'Vacuna actualizada correctamente'
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
        message: 'Ya existe una vacuna con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar vacuna'
    });
  }
});

// @route   PATCH /api/vacunas/:id/status
// @desc    Activar/desactivar vacuna (solo admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const vacuna = await Vacuna.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna,
      message: isActive ? 'Vacuna activada correctamente' : 'Vacuna desactivada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de vacuna'
    });
  }
});

module.exports = router;

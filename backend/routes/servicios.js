const express = require('express');
const Servicio = require('../models/Servicio');
const router = express.Router();

// @route   GET /api/servicios
// @desc    Obtener todos los servicios
router.get('/', async (req, res) => {
  try {
    const { category, active, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const servicios = await Servicio.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Servicio.countDocuments(query);

    res.json({
      success: true,
      data: servicios,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios'
    });
  }
});

// @route   GET /api/servicios/:id
// @desc    Obtener servicio por ID
router.get('/:id', async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: servicio
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicio'
    });
  }
});

// @route   POST /api/servicios
// @desc    Crear nuevo servicio
router.post('/', async (req, res) => {
  try {
    const servicio = await Servicio.create(req.body);
    
    res.status(201).json({
      success: true,
      data: servicio
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
      message: 'Error al crear servicio'
    });
  }
});

// @route   PUT /api/servicios/:id
// @desc    Actualizar servicio
router.put('/:id', async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: servicio
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
      message: 'Error al actualizar servicio'
    });
  }
});

// @route   DELETE /api/servicios/:id
// @desc    Eliminar servicio (desactivar)
router.delete('/:id', async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Servicio desactivado correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar servicio'
    });
  }
});

module.exports = router;

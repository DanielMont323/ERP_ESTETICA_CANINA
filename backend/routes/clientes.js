const express = require('express');
const Cliente = require('../models/Cliente');
const Mascota = require('../models/Mascota');
const router = express.Router();

// @route   GET /api/clientes
// @desc    Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const { search, active, page = 1, limit = 10 } = req.query;
    let query = {};

    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const clientes = await Cliente.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Cliente.countDocuments(query);

    res.json({
      success: true,
      data: clientes,
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
      message: 'Error al obtener clientes'
    });
  }
});

// @route   GET /api/clientes/:id
// @desc    Obtener cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener mascotas del cliente
    const mascotas = await Mascota.find({ owner: req.params.id });
    
    res.json({
      success: true,
      data: {
        ...cliente.toObject(),
        mascotas
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente'
    });
  }
});

// @route   POST /api/clientes
// @desc    Crear nuevo cliente
router.post('/', async (req, res) => {
  try {
    const cliente = await Cliente.create(req.body);
    
    res.status(201).json({
      success: true,
      data: cliente
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
        message: 'El teléfono o email ya está registrado'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente'
    });
  }
});

// @route   PUT /api/clientes/:id
// @desc    Actualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
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
        message: 'El teléfono o email ya está registrado'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cliente'
    });
  }
});

// @route   DELETE /api/clientes/:id
// @desc    Eliminar cliente permanentemente
router.delete('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // También eliminar permanentemente las mascotas del cliente
    await Mascota.deleteMany({ owner: req.params.id });
    
    res.json({
      success: true,
      message: 'Cliente y sus mascotas eliminados permanentemente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cliente'
    });
  }
});

module.exports = router;

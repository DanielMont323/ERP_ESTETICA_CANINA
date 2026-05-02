const express = require('express');
const Proveedor = require('../models/Proveedor');
const router = express.Router();

// @route   GET /api/proveedores
// @desc    Obtener todos los proveedores
router.get('/', async (req, res) => {
  try {
    const { search, active, page = 1, limit = 10 } = req.query;
    let query = {};

    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const proveedores = await Proveedor.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Proveedor.countDocuments(query);

    res.json({
      success: true,
      data: proveedores,
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
      message: 'Error al obtener proveedores'
    });
  }
});

// @route   GET /api/proveedores/:id
// @desc    Obtener proveedor por ID
router.get('/:id', async (req, res) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    
    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: proveedor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedor'
    });
  }
});

// @route   POST /api/proveedores
// @desc    Crear nuevo proveedor
router.post('/', async (req, res) => {
  try {
    const proveedor = await Proveedor.create(req.body);
    
    res.status(201).json({
      success: true,
      data: proveedor
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
      message: 'Error al crear proveedor'
    });
  }
});

// @route   PUT /api/proveedores/:id
// @desc    Actualizar proveedor
router.put('/:id', async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: proveedor
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
      message: 'Error al actualizar proveedor'
    });
  }
});

// @route   DELETE /api/proveedores/:id
// @desc    Eliminar proveedor permanentemente
router.delete('/:id', async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndDelete(req.params.id);
    
    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Proveedor eliminado permanentemente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proveedor'
    });
  }
});

// @route   PATCH /api/proveedores/:id/debt
// @desc    Actualizar deuda del proveedor
router.patch('/:id/debt', async (req, res) => {
  try {
    const { amount, operation } = req.body; // operation: 'add' | 'subtract' | 'set'
    
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    let newDebt;
    switch (operation) {
      case 'add':
        newDebt = proveedor.currentDebt + amount;
        break;
      case 'subtract':
        newDebt = proveedor.currentDebt - amount;
        if (newDebt < 0) {
          return res.status(400).json({
            success: false,
            message: 'La deuda no puede ser negativa'
          });
        }
        break;
      case 'set':
        newDebt = amount;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Operación no válida'
        });
    }
    
    proveedor.currentDebt = newDebt;
    await proveedor.save();
    
    res.json({
      success: true,
      data: proveedor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar deuda'
    });
  }
});

module.exports = router;

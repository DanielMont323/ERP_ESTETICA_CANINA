const express = require('express');
const Producto = require('../models/Producto');
const router = express.Router();

// @route   GET /api/productos
// @desc    Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { category, active, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const productos = await Producto.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      count: productos.length,
      data: productos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
});

// @route   GET /api/productos/low-stock
// @desc    Obtener productos con bajo stock
router.get('/low-stock', async (req, res) => {
  try {
    const productos = await Producto.find({
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 });
    
    res.json({
      success: true,
      count: productos.length,
      data: productos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con bajo stock'
    });
  }
});

// @route   GET /api/productos/:id
// @desc    Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto'
    });
  }
});

// @route   POST /api/productos
// @desc    Crear nuevo producto
router.post('/', async (req, res) => {
  try {
    const producto = await Producto.create(req.body);
    
    res.status(201).json({
      success: true,
      data: producto
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
      message: 'Error al crear producto'
    });
  }
});

// @route   PUT /api/productos/:id
// @desc    Actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: producto
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
      message: 'Error al actualizar producto'
    });
  }
});

// @route   DELETE /api/productos/:id
// @desc    Eliminar producto (desactivar)
router.delete('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Producto desactivado correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar producto'
    });
  }
});

// @route   PATCH /api/productos/:id/stock
// @desc    Actualizar stock de producto
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' | 'subtract' | 'set'
    
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    let newStock;
    switch (operation) {
      case 'add':
        newStock = producto.stock + quantity;
        break;
      case 'subtract':
        newStock = producto.stock - quantity;
        if (newStock < 0) {
          return res.status(400).json({
            success: false,
            message: 'Stock insuficiente'
          });
        }
        break;
      case 'set':
        newStock = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Operación no válida'
        });
    }
    
    producto.stock = newStock;
    await producto.save();
    
    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock'
    });
  }
});

module.exports = router;

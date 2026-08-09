const express = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const CategoriaProducto = require('../models/CategoriaProducto');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/productos/search
// @desc    Buscar productos por nombre o SKU
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    let productos = [];

    // Primero buscar coincidencia exacta por SKU
    const productoPorSku = await Producto.findOne({
      sku: q,
      isActive: true,
      stock: { $gt: 0 }
    });

    if (productoPorSku) {
      productos.push(productoPorSku);
    } else {
      // Si no hay coincidencia por SKU, buscar por nombre
      productos = await Producto.find({
        name: { $regex: q, $options: 'i' },
        isActive: true,
        stock: { $gt: 0 }
      }).limit(10);
    }

    // Populate manual de category
    for (const producto of productos) {
      if (producto.category && typeof producto.category === 'string') {
        if (mongoose.Types.ObjectId.isValid(producto.category)) {
          const categoria = await CategoriaProducto.findById(producto.category);
          producto.category = categoria || producto.category;
        } else {
          const categoria = await CategoriaProducto.findOne({ name: producto.category, isActive: true });
          producto.category = categoria || producto.category;
        }
      } else if (producto.category && mongoose.Types.ObjectId.isValid(producto.category)) {
        const categoria = await CategoriaProducto.findById(producto.category);
        producto.category = categoria || producto.category;
      }
    }

    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar productos'
    });
  }
});

// @route   GET /api/productos
// @desc    Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { category, active, lowStock, page = 1, limit = 50 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const productos = await Producto.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Populate manual de category para manejar String y ObjectId
    for (const producto of productos) {
      if (producto.category && typeof producto.category === 'string') {
        // Si es String, verificar si es un ObjectId válido
        if (mongoose.Types.ObjectId.isValid(producto.category)) {
          // Es un ObjectId como string, buscar por ID
          const categoria = await CategoriaProducto.findById(producto.category);
          producto.category = categoria || producto.category;
        } else {
          // Es un nombre de categoría, buscar por nombre
          const categoria = await CategoriaProducto.findOne({ name: producto.category, isActive: true });
          producto.category = categoria || producto.category;
        }
      } else if (producto.category && mongoose.Types.ObjectId.isValid(producto.category)) {
        // Si es ObjectId, buscar la categoría manualmente
        const categoria = await CategoriaProducto.findById(producto.category);
        producto.category = categoria || producto.category;
      }
    }

    const total = await Producto.countDocuments(query);

    res.json({
      success: true,
      data: productos,
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
    })
      .populate('category', 'name')
      .sort({ stock: 1 });
    
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
    const producto = await Producto.findById(req.params.id)
      .populate('category', 'name');
    
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
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, ...rest } = req.body;
    
    // Si category es un ObjectId válido, usarlo directamente
    // Si es un string, buscar la categoría por nombre y usar su ObjectId
    let finalCategory = category;
    if (category && typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
      const categoria = await CategoriaProducto.findOne({ name: category, isActive: true });
      if (categoria) {
        finalCategory = categoria._id;
      }
    }
    
    const producto = await Producto.create({
      ...rest,
      category: finalCategory
    });
    
    // Populate para respuesta
    await producto.populate('category', 'name');
    
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
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, ...rest } = req.body;
    
    // Si category es un ObjectId válido, usarlo directamente
    // Si es un string, buscar la categoría por nombre y usar su ObjectId
    let finalCategory = category;
    if (category && typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
      const categoria = await CategoriaProducto.findOne({ name: category, isActive: true });
      if (categoria) {
        finalCategory = categoria._id;
      }
    }
    
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      {
        ...rest,
        category: finalCategory
      },
      { new: true, runValidators: true }
    );
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Populate para respuesta
    await producto.populate('category', 'name');
    
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

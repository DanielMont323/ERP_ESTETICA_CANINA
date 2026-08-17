const express = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const CategoriaProducto = require('../models/CategoriaProducto');
const Venta = require('../models/Venta');
const Compra = require('../models/Compra');
const Servicio = require('../models/Servicio');
const SupplierProduct = require('../models/SupplierProduct');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Función auxiliar para verificar si un producto tiene historial
async function checkProductHistory(productId) {
  try {
    const hasSales = await Venta.exists({
      'items.item': productId,
      'items.type': 'producto'
    });
    
    const hasPurchases = await Compra.exists({
      'items.product': productId
    });
    
    const hasServiceSupply = await Servicio.exists({
      'insumos.producto': productId
    });
    
    const hasSupplierProduct = await SupplierProduct.exists({
      product: productId
    });
    
    return {
      hasHistory: hasSales || hasPurchases || hasServiceSupply || hasSupplierProduct,
      details: {
        hasSales: !!hasSales,
        hasPurchases: !!hasPurchases,
        hasServiceSupply: !!hasServiceSupply,
        hasSupplierProduct: !!hasSupplierProduct
      }
    };
  } catch (error) {
    console.error('Error checking product history:', error);
    return { hasHistory: false, details: {} };
  }
}

// @route   GET /api/productos/search
// @desc    Buscar productos por nombre o SKU
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, includeInactive } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    let productos = [];

    // Determinar si incluir productos inactivos (solo para admin)
    const shouldIncludeInactive = includeInactive === 'true' || includeInactive === true;

    // Primero buscar coincidencia exacta por SKU
    const skuQuery = { sku: q, isDeleted: { $ne: true } };
    if (!shouldIncludeInactive) {
      skuQuery.isActive = true;
      skuQuery.stock = { $gt: 0 };
    }

    const productoPorSku = await Producto.findOne(skuQuery);

    if (productoPorSku) {
      productos.push(productoPorSku);
    } else {
      // Si no hay coincidencia por SKU, buscar por nombre
      const nameQuery = { name: { $regex: q, $options: 'i' }, isDeleted: { $ne: true } };
      if (!shouldIncludeInactive) {
        nameQuery.isActive = true;
        nameQuery.stock = { $gt: 0 };
      }

      productos = await Producto.find(nameQuery).limit(10);
    }

    // Optimización: Obtener todas las categorías en una sola consulta
    const allCategoryIds = new Set();
    const allCategoryNames = new Set();
    
    productos.forEach(producto => {
      if (producto.category) {
        if (typeof producto.category === 'string') {
          if (mongoose.Types.ObjectId.isValid(producto.category)) {
            allCategoryIds.add(producto.category);
          } else {
            allCategoryNames.add(producto.category);
          }
        } else if (mongoose.Types.ObjectId.isValid(producto.category)) {
          allCategoryIds.add(producto.category.toString());
        }
      }
    });

    const categoriasById = await CategoriaProducto.find({ 
      _id: { $in: Array.from(allCategoryIds) } 
    });
    const categoriasByName = await CategoriaProducto.find({ 
      name: { $in: Array.from(allCategoryNames) },
      isActive: true 
    });

    const categoriaIdMap = new Map(categoriasById.map(c => [c._id.toString(), c]));
    const categoriaNameMap = new Map(categoriasByName.map(c => [c.name, c]));

    // Asignar categorías usando los mapas
    for (const producto of productos) {
      if (producto.category && typeof producto.category === 'string') {
        if (mongoose.Types.ObjectId.isValid(producto.category)) {
          producto.category = categoriaIdMap.get(producto.category) || producto.category;
        } else {
          producto.category = categoriaNameMap.get(producto.category) || producto.category;
        }
      } else if (producto.category && mongoose.Types.ObjectId.isValid(producto.category)) {
        producto.category = categoriaIdMap.get(producto.category.toString()) || producto.category;
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
    const { category, active, lowStock, search, page = 1, limit = 50 } = req.query;
    let query = { isDeleted: { $ne: true } };

    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const productos = await Producto.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Optimización: Obtener todas las categorías en una sola consulta
    const allCategoryIds = new Set();
    const allCategoryNames = new Set();
    
    productos.forEach(producto => {
      if (producto.category) {
        if (typeof producto.category === 'string') {
          if (mongoose.Types.ObjectId.isValid(producto.category)) {
            allCategoryIds.add(producto.category);
          } else {
            allCategoryNames.add(producto.category);
          }
        } else if (mongoose.Types.ObjectId.isValid(producto.category)) {
          allCategoryIds.add(producto.category.toString());
        }
      }
    });

    const categoriasById = await CategoriaProducto.find({ 
      _id: { $in: Array.from(allCategoryIds) } 
    });
    const categoriasByName = await CategoriaProducto.find({ 
      name: { $in: Array.from(allCategoryNames) },
      isActive: true 
    });

    const categoriaIdMap = new Map(categoriasById.map(c => [c._id.toString(), c]));
    const categoriaNameMap = new Map(categoriasByName.map(c => [c.name, c]));

    // Asignar categorías usando los mapas
    for (const producto of productos) {
      if (producto.category && typeof producto.category === 'string') {
        if (mongoose.Types.ObjectId.isValid(producto.category)) {
          producto.category = categoriaIdMap.get(producto.category) || producto.category;
        } else {
          producto.category = categoriaNameMap.get(producto.category) || producto.category;
        }
      } else if (producto.category && mongoose.Types.ObjectId.isValid(producto.category)) {
        producto.category = categoriaIdMap.get(producto.category.toString()) || producto.category;
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
      $expr: { $lte: ['$stock', '$minStock'] },
      isDeleted: { $ne: true }
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
    
    if (producto.isDeleted) {
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
    const { category, sku, ...rest } = req.body;
    
    // Validar SKU obligatorio
    if (!sku || sku.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El SKU es obligatorio'
      });
    }
    
    const skuTrimmed = sku.trim();
    
    // Validar SKU duplicado (incluyendo productos eliminados)
    const existingProduct = await Producto.findOne({ sku: skuTrimmed });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'El SKU ya está registrado'
      });
    }
    
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
      sku: skuTrimmed,
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El SKU ya está registrado'
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
// @desc    Eliminar producto (físico si no tiene historial, lógico si tiene historial)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar si el producto tiene historial
    const historyCheck = await checkProductHistory(req.params.id);
    
    if (historyCheck.hasHistory) {
      // Eliminación lógica - archivar
      producto.isActive = false;
      producto.isDeleted = true;
      producto.deletedAt = new Date();
      producto.deletedBy = req.user._id;
      await producto.save();
      
      return res.json({
        success: true,
        message: 'Producto archivado porque tiene historial de operaciones',
        data: producto,
        action: 'archived'
      });
    } else {
      // Eliminación física
      await Producto.findByIdAndDelete(req.params.id);
      
      return res.json({
        success: true,
        message: 'Producto eliminado definitivamente',
        action: 'deleted'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto'
    });
  }
});

// @route   PATCH /api/productos/:id/restore
// @desc    Restaurar producto archivado
router.patch('/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    if (!producto.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Este producto no está archivado'
      });
    }
    
    // Restaurar producto
    producto.isActive = true;
    producto.isDeleted = false;
    producto.deletedAt = null;
    producto.deletedBy = null;
    await producto.save();
    
    await producto.populate('category', 'name');
    
    res.json({
      success: true,
      message: 'Producto restaurado correctamente',
      data: producto
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al restaurar producto'
    });
  }
});

// @route   GET /api/productos/archived
// @desc    Obtener productos archivados
router.get('/archived', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productos = await Producto.find({ isDeleted: true })
      .sort({ deletedAt: -1 });
    
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
      message: 'Error al obtener productos archivados'
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

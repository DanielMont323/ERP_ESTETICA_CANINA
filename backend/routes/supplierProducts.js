const express = require('express');
const router = express.Router();
const SupplierProduct = require('../models/SupplierProduct');
const Proveedor = require('../models/Proveedor');
const Producto = require('../models/Producto');

// @route   GET /api/supplier-products
// @desc    Obtener todas las relaciones proveedor-producto
router.get('/', async (req, res) => {
  try {
    const { supplier, product, active, page = 1, limit = 10 } = req.query;
    let query = {};

    if (supplier) query.supplier = supplier;
    if (product) query.product = product;
    if (active !== undefined) query.isActive = active === 'true';

    const supplierProducts = await SupplierProduct.find(query)
      .populate('supplier', 'name contact phone')
      .populate('product', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupplierProduct.countDocuments(query);

    res.json({
      success: true,
      data: supplierProducts,
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
      message: 'Error al obtener relaciones proveedor-producto'
    });
  }
});

// @route   GET /api/supplier-products/:id
// @desc    Obtener una relación proveedor-producto específica
router.get('/:id', async (req, res) => {
  try {
    const supplierProduct = await SupplierProduct.findById(req.params.id)
      .populate('supplier', 'name contact phone')
      .populate('product', 'name description');

    if (!supplierProduct) {
      return res.status(404).json({
        success: false,
        message: 'Relación proveedor-producto no encontrada'
      });
    }

    res.json({
      success: true,
      data: supplierProduct
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener relación proveedor-producto'
    });
  }
});

// @route   POST /api/supplier-products
// @desc    Crear una nueva relación proveedor-producto
router.post('/', async (req, res) => {
  try {
    const { supplier, product, baseCost, discountPercentage, discountDays } = req.body;

    // Verificar que el proveedor y producto existan
    const proveedor = await Proveedor.findById(supplier);
    if (!proveedor) {
      return res.status(400).json({
        success: false,
        message: 'El proveedor no existe'
      });
    }

    const producto = await Producto.findById(product);
    if (!producto) {
      return res.status(400).json({
        success: false,
        message: 'El producto no existe'
      });
    }

    // Verificar que no exista ya la relación
    const existingRelation = await SupplierProduct.findOne({ supplier, product });
    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una relación para este proveedor y producto'
      });
    }

    const supplierProduct = new SupplierProduct({
      supplier,
      product,
      baseCost,
      discountPercentage,
      discountDays
    });

    await supplierProduct.save();
    await supplierProduct.populate('supplier', 'name contact phone');
    await supplierProduct.populate('product', 'name description');

    res.status(201).json({
      success: true,
      data: supplierProduct,
      message: 'Relación proveedor-producto creada correctamente'
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
      message: 'Error al crear relación proveedor-producto'
    });
  }
});

// @route   PUT /api/supplier-products/:id
// @desc    Actualizar una relación proveedor-producto
router.put('/:id', async (req, res) => {
  try {
    const { baseCost, discountPercentage, discountDays, isActive } = req.body;

    const supplierProduct = await SupplierProduct.findByIdAndUpdate(
      req.params.id,
      { baseCost, discountPercentage, discountDays, isActive },
      { new: true, runValidators: true }
    ).populate('supplier', 'name contact phone')
     .populate('product', 'name description');

    if (!supplierProduct) {
      return res.status(404).json({
        success: false,
        message: 'Relación proveedor-producto no encontrada'
      });
    }

    res.json({
      success: true,
      data: supplierProduct,
      message: 'Relación proveedor-producto actualizada correctamente'
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
      message: 'Error al actualizar relación proveedor-producto'
    });
  }
});

// @route   DELETE /api/supplier-products/:id
// @desc    Eliminar una relación proveedor-producto
router.delete('/:id', async (req, res) => {
  try {
    const supplierProduct = await SupplierProduct.findByIdAndDelete(req.params.id);

    if (!supplierProduct) {
      return res.status(404).json({
        success: false,
        message: 'Relación proveedor-producto no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Relación proveedor-producto eliminada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar relación proveedor-producto'
    });
  }
});

// @route   GET /api/supplier-products/product/:productId
// @desc    Obtener todas las relaciones para un producto específico
router.get('/product/:productId', async (req, res) => {
  try {
    const supplierProducts = await SupplierProduct.find({ 
      product: req.params.productId,
      isActive: true 
    })
      .populate('supplier', 'name contact phone')
      .populate('product', 'name description')
      .sort({ discountPercentage: -1 });

    res.json({
      success: true,
      data: supplierProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener relaciones del producto'
    });
  }
});

// @route   GET /api/supplier-products/supplier/:supplierId
// @desc    Obtener todas las relaciones para un proveedor específico
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const supplierProducts = await SupplierProduct.find({ 
      supplier: req.params.supplierId,
      isActive: true 
    })
      .populate('supplier', 'name contact phone')
      .populate('product', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: supplierProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener relaciones del proveedor'
    });
  }
});

module.exports = router;

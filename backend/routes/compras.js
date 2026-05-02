const express = require('express');
const Compra = require('../models/Compra');
const Proveedor = require('../models/Proveedor');
const Producto = require('../models/Producto');
const CuentaPorPagar = require('../models/CuentaPorPagar');
const router = express.Router();

// @route   GET /api/compras
// @desc    Obtener todas las compras
router.get('/', async (req, res) => {
  try {
    const { proveedor, status, type, page = 1, limit = 10 } = req.query;
    let query = {};

    if (proveedor) query.proveedor = proveedor;
    if (status) query.status = status;
    if (type) query.type = type;

    const compras = await Compra.find(query)
      .populate('proveedor', 'name contact phone')
      .populate('user', 'name')
      .populate('items.product', 'name sku')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Compra.countDocuments(query);

    res.json({
      success: true,
      data: compras,
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
      message: 'Error al obtener compras'
    });
  }
});

// @route   GET /api/compras/:id
// @desc    Obtener compra por ID
router.get('/:id', async (req, res) => {
  try {
    const compra = await Compra.findById(req.params.id)
      .populate('proveedor', 'name contact phone email creditDays')
      .populate('user', 'name')
      .populate('items.product', 'name sku category');
    
    if (!compra) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: compra
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener compra'
    });
  }
});

// @route   POST /api/compras
// @desc    Crear nueva compra
router.post('/', async (req, res) => {
  try {
    const { proveedor, items, type, paymentMethod, user, notes, invoice } = req.body;

    // Validar que haya items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La compra debe tener al menos un item'
      });
    }

    // Verificar que el proveedor exista
    const proveedorDoc = await Proveedor.findById(proveedor);
    if (!proveedorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    const SupplierProduct = require('../models/SupplierProduct');

    // Procesar items con autocompletado de descuentos
    const processedItems = [];
    for (const item of items) {
      const producto = await Producto.findById(item.product);
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: `Producto con ID ${item.product} no encontrado`
        });
      }

      // Buscar condiciones de descuento para este proveedor y producto
      const supplierProduct = await SupplierProduct.findOne({
        supplier: proveedor,
        product: item.product,
        isActive: true
      });

      // Usar costo del item o el costo base de SupplierProduct
      const baseUnitCost = item.unitCost || (supplierProduct?.baseCost || producto.cost);
      
      // Autocompletar condiciones de descuento
      const processedItem = {
        product: item.product,
        quantity: item.quantity,
        baseUnitCost: baseUnitCost,
        unitCost: baseUnitCost, // Inicialmente igual al base
        discountPercentage: supplierProduct?.discountPercentage || 0,
        discountDays: supplierProduct?.discountDays || 0,
        discountApplied: false
      };

      processedItems.push(processedItem);

      // Actualizar stock y costo del producto
      producto.stock += item.quantity;
      producto.cost = baseUnitCost;
      await producto.save();
    }

    // Calcular fecha de vencimiento para compras a crédito
    let dueDate;
    if (type === 'credito') {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + proveedorDoc.creditDays);
    }

    // Crear compra con items procesados
    const compra = await Compra.create({
      proveedor,
      items: processedItems,
      type,
      paymentMethod: type === 'contado' ? paymentMethod : undefined,
      dueDate,
      user,
      notes,
      invoice
    });

    // Si es a crédito, crear cuenta por pagar
    if (type === 'credito') {
      await CuentaPorPagar.create({
        proveedor,
        compra: compra._id,
        monto: compra.total,
        montoBase: compra.baseTotal,
        descuentoDisponible: compra.totalDiscount,
        discountDeadline: compra.discountDeadline,
        saldo: compra.total,
        dueDate,
        notes: `Cuenta generada por compra ${compra._id}`
      });

      // Actualizar deuda del proveedor
      proveedorDoc.currentDebt += compra.total;
      await proveedorDoc.save();
    }

    // Populate para respuesta
    await compra.populate('proveedor', 'name contact phone');
    await compra.populate('user', 'name');
    await compra.populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      data: compra
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
      message: 'Error al crear compra'
    });
  }
});

// @route   PUT /api/compras/:id
// @desc    Actualizar compra
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const compra = await Compra.findById(req.params.id);
    if (!compra) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    // Solo permitir actualizar status y notas
    if (status) compra.status = status;
    if (notes !== undefined) compra.notes = notes;

    await compra.save();
    await compra.populate('proveedor', 'name contact phone');
    await compra.populate('user', 'name');
    await compra.populate('items.product', 'name sku');

    res.json({
      success: true,
      data: compra
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar compra'
    });
  }
});

// @route   DELETE /api/compras/:id
// @desc    Cancelar compra y devolver stock
router.delete('/:id', async (req, res) => {
  try {
    const compra = await Compra.findById(req.params.id);
    
    if (!compra) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    if (compra.status === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La compra ya está cancelada'
      });
    }

    // Devolver stock al inventario
    for (const item of compra.items) {
      const producto = await Producto.findById(item.product);
      if (producto) {
        producto.stock -= item.quantity;
        if (producto.stock < 0) producto.stock = 0;
        await producto.save();
      }
    }

    // Si es a crédito, actualizar cuenta por pagar y deuda del proveedor
    if (compra.type === 'credito') {
      await CuentaPorPagar.findOneAndUpdate(
        { compra: compra._id },
        { status: 'cancelada' }
      );

      const proveedor = await Proveedor.findById(compra.proveedor);
      if (proveedor) {
        proveedor.currentDebt -= compra.total;
        if (proveedor.currentDebt < 0) proveedor.currentDebt = 0;
        await proveedor.save();
      }
    }

    // Actualizar status
    compra.status = 'cancelada';
    await compra.save();

    res.json({
      success: true,
      message: 'Compra cancelada y stock devuelto'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar compra'
    });
  }
});

module.exports = router;

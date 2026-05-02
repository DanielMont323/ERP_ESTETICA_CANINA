const express = require('express');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const router = express.Router();

// @route   GET /api/ventas
// @desc    Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const { date, customer, status, page = 1, limit = 10 } = req.query;
    let query = {};

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    if (customer) query.customer = customer;
    if (status) query.status = status;

    const ventas = await Venta.find(query)
      .populate('customer', 'name phone')
      .populate('user', 'name')
      .populate('items.item', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Venta.countDocuments(query);

    res.json({
      success: true,
      data: ventas,
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
      message: 'Error al obtener ventas'
    });
  }
});

// @route   GET /api/ventas/:id
// @desc    Obtener venta por ID
router.get('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('user', 'name')
      .populate('items.item');
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener venta'
    });
  }
});

// @route   POST /api/ventas
// @desc    Crear nueva venta
router.post('/', async (req, res) => {
  try {
    const { items, paymentMethod, customer, user, notes } = req.body;

    // Validar que haya items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La venta debe tener al menos un item'
      });
    }

    // Verificar stock y actualizar inventario
    for (const item of items) {
      if (item.type === 'producto') {
        const producto = await Producto.findById(item.item);
        if (!producto) {
          return res.status(404).json({
            success: false,
            message: `Producto con ID ${item.item} no encontrado`
          });
        }

        if (producto.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para ${producto.name}. Stock disponible: ${producto.stock}`
          });
        }

        // Actualizar stock
        producto.stock -= item.quantity;
        await producto.save();
      }
    }

    // Crear venta
    const venta = await Venta.create({
      items,
      paymentMethod,
      customer,
      user,
      notes
    });

    // Populate para respuesta
    await venta.populate('customer', 'name phone');
    await venta.populate('user', 'name');
    await venta.populate('items.item', 'name');

    res.status(201).json({
      success: true,
      data: venta
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
      message: 'Error al crear venta'
    });
  }
});

// @route   PUT /api/ventas/:id
// @desc    Actualizar venta (solo status o notas)
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const venta = await Venta.findById(req.params.id);
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Solo permitir actualizar status y notas
    if (status) venta.status = status;
    if (notes !== undefined) venta.notes = notes;

    await venta.save();
    await venta.populate('customer', 'name phone');
    await venta.populate('user', 'name');
    await venta.populate('items.item', 'name');

    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar venta'
    });
  }
});

// @route   DELETE /api/ventas/:id
// @desc    Cancelar venta y devolver stock
router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    if (venta.status === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La venta ya está cancelada'
      });
    }

    // Devolver stock al inventario
    for (const item of venta.items) {
      if (item.type === 'producto') {
        const producto = await Producto.findById(item.item);
        if (producto) {
          producto.stock += item.quantity;
          await producto.save();
        }
      }
    }

    // Actualizar status
    venta.status = 'cancelada';
    await venta.save();

    res.json({
      success: true,
      message: 'Venta cancelada y stock devuelto'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar venta'
    });
  }
});

// @route   GET /api/ventas/daily/:date
// @desc    Obtener ventas del día
router.get('/daily/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const ventas = await Venta.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'completada'
    }).populate('customer', 'name');

    const total = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const commission = ventas.reduce((sum, venta) => sum + venta.commission, 0);
    const netIncome = ventas.reduce((sum, venta) => sum + venta.netIncome, 0);

    res.json({
      success: true,
      data: {
        date: req.params.date,
        ventas,
        summary: {
          totalVentas: ventas.length,
          totalSales: total,
          totalCommission: commission,
          totalNetIncome: netIncome
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas del día'
    });
  }
});

module.exports = router;

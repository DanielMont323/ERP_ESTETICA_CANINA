const express = require('express');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const Servicio = require('../models/Servicio');
const Cliente = require('../models/Cliente');
const Mascota = require('../models/Mascota');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/ventas
// @desc    Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const { date, startDate, endDate, customer, status, page = 1, limit = 50 } = req.query;
    let query = {};

    // Filtro por fecha única (compatibilidad con existente)
    if (date && !startDate && !endDate) {
      const filterDate = new Date(date);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Filtro por rango de fechas
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Validar que startDate <= endDate
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'La fecha inicial debe ser menor o igual a la fecha final'
        });
      }
      
      query.date = { $gte: start, $lte: end };
    } else if (startDate && !endDate) {
      // Solo startDate
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.date = { $gte: start };
    } else if (!startDate && endDate) {
      // Solo endDate
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $lte: end };
    }

    if (customer) query.customer = customer;
    if (status) query.status = status;

    const ventas = await Venta.find(query)
      .populate('customer', 'name phone')
      .populate('user', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Populate items manualmente según el tipo
    for (const venta of ventas) {
      for (const item of venta.items) {
        if (item.type === 'producto') {
          const producto = await Producto.findById(item.item).select('name price');
          item.item = producto;
        } else if (item.type === 'servicio') {
          const servicio = await Servicio.findById(item.item).select('name price');
          item.item = servicio;
        }
      }
    }

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

// @route   GET /api/ventas/by-mascota/:mascotaId
// @desc    Obtener ventas por mascota
router.get('/by-mascota/:mascotaId', authenticateToken, async (req, res) => {
  try {
    const { mascotaId } = req.params;

    const ventas = await Venta.find({ mascota: mascotaId })
      .populate('customer', 'name phone')
      .populate('mascota', 'name type breed')
      .populate('user', 'name')
      .sort({ date: -1 });

    // Populate items manualmente según el tipo
    for (const venta of ventas) {
      for (const item of venta.items) {
        if (item.type === 'producto') {
          const producto = await Producto.findById(item.item).select('name price');
          item.item = producto;
        } else if (item.type === 'servicio') {
          const servicio = await Servicio.findById(item.item).select('name price');
          item.item = servicio;
        }
      }
    }

    res.json({
      success: true,
      data: ventas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas de la mascota'
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
    const { items, paymentMethod, customer, mascota, user, notes, amountReceived } = req.body;

    // 1. Validar que haya items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La venta debe tener al menos un item'
      });
    }

    // 2. Validar relación cliente-mascota
    if (mascota) {
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Si se selecciona una mascota, debe seleccionar un cliente'
        });
      }

      const mascotaDoc = await Mascota.findById(mascota);
      if (!mascotaDoc) {
        return res.status(404).json({
          success: false,
          message: 'Mascota no encontrada'
        });
      }

      if (!mascotaDoc.owner || mascotaDoc.owner.toString() !== customer) {
        return res.status(403).json({
          success: false,
          message: 'La mascota no pertenece al cliente seleccionado'
        });
      }
    }

    // 3. Validar monto recibido para efectivo
    if (paymentMethod === 'efectivo') {
      if (!amountReceived || amountReceived < 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto recibido es requerido para pagos en efectivo'
        });
      }
    }

    // 4. Verificar disponibilidad de stock (SIN actualizar aún)
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
      }
    }

    // 5. Crear venta
    const venta = await Venta.create({
      items,
      paymentMethod,
      customer,
      mascota,
      user,
      notes
    });

    // 6. Calcular y validar cambio para efectivo
    if (paymentMethod === 'efectivo' && amountReceived) {
      const calculatedChange = Math.round((amountReceived - venta.total) * 100) / 100;
      
      if (calculatedChange < 0) {
        // Eliminar venta si el pago es insuficiente (stock no fue descargado aún)
        await Venta.findByIdAndDelete(venta._id);
        
        return res.status(400).json({
          success: false,
          message: `El monto recibido es insuficiente. Faltan $${Math.abs(calculatedChange).toFixed(2)}`
        });
      }
      
      venta.amountReceived = amountReceived;
      venta.change = calculatedChange;
      await venta.save();
    }

    // 7. Actualizar inventario (solo después de todas las validaciones)
    for (const item of items) {
      if (item.type === 'producto') {
        const producto = await Producto.findById(item.item);
        if (producto) {
          producto.stock -= item.quantity;
          await producto.save();
        }
      }
    }

    // Populate para respuesta
    await venta.populate('customer', 'name phone');
    await venta.populate('mascota', 'name type breed');
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
// @desc    Actualizar venta (solo status o notas para usuarios normales, campos sensibles solo para admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes, items, total, commission, discount, customer, mascota, amountReceived, change } = req.body;
    
    const venta = await Venta.findById(req.params.id);
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Campos sensibles que solo admin puede modificar
    const sensitiveFields = ['items', 'total', 'commission', 'discount', 'customer', 'mascota', 'amountReceived', 'change'];
    const hasSensitiveFields = sensitiveFields.some(field => req.body[field] !== undefined);

    if (hasSensitiveFields) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para modificar campos financieros de la venta'
        });
      }
      
      // Validar relación cliente-mascota si se modifica
      if (mascota !== undefined && customer !== undefined) {
        if (mascota && !customer) {
          return res.status(400).json({
            success: false,
            message: 'Si se selecciona una mascota, debe seleccionar un cliente'
          });
        }

        if (mascota) {
          const mascotaDoc = await Mascota.findById(mascota);
          if (!mascotaDoc) {
            return res.status(404).json({
              success: false,
              message: 'Mascota no encontrada'
            });
          }

          if (!mascotaDoc.owner || mascotaDoc.owner.toString() !== customer) {
            return res.status(403).json({
              success: false,
              message: 'La mascota no pertenece al cliente seleccionado'
            });
          }
        }
      }
      
      // Admin puede modificar campos sensibles
      if (items) venta.items = items;
      if (total !== undefined) venta.total = total;
      if (commission !== undefined) venta.commission = commission;
      if (discount !== undefined) venta.discount = discount;
      if (customer !== undefined) venta.customer = customer;
      if (mascota !== undefined) venta.mascota = mascota;
      if (amountReceived !== undefined) venta.amountReceived = amountReceived;
      if (change !== undefined) venta.change = change;
    }

    // Cualquier usuario puede modificar status y notas
    if (status) venta.status = status;
    if (notes !== undefined) venta.notes = notes;

    await venta.save();
    await venta.populate('customer', 'name phone');
    await venta.populate('mascota', 'name type breed');
    await venta.populate('user', 'name');
    
    // Populate items manualmente según el tipo
    for (const item of venta.items) {
      if (item.type === 'producto') {
        const producto = await Producto.findById(item.item).select('name price');
        item.item = producto;
      } else if (item.type === 'servicio') {
        const servicio = await Servicio.findById(item.item).select('name price');
        item.item = servicio;
      }
    }

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

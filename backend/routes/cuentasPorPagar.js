const express = require('express');
const CuentaPorPagar = require('../models/CuentaPorPagar');
const Proveedor = require('../models/Proveedor');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/cuentas-por-pagar
// @desc    Obtener todas las cuentas por pagar
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { proveedor, status, dueDate, page = 1, limit = 10 } = req.query;
    let query = {};

    if (proveedor) query.proveedor = proveedor;
    if (status) query.status = status;
    if (dueDate) {
      const date = new Date(dueDate);
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.dueDate = { $gte: startDate, $lte: endDate };
    }

    const cuentas = await CuentaPorPagar.find(query)
      .populate('proveedor', 'name contact phone')
      .populate('compra', 'invoice date total baseTotal totalDiscount discountDeadline')
      .populate('payments.user', 'name')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CuentaPorPagar.countDocuments(query);

    // Agregar información de descuento a cada cuenta
    const cuentasWithDiscountInfo = cuentas.map(cuenta => ({
      ...cuenta.toObject(),
      discountInfo: cuenta.checkDiscountAvailability()
    }));

    res.json({
      success: true,
      data: cuentasWithDiscountInfo,
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
      message: 'Error al obtener cuentas por pagar'
    });
  }
});

// @route   POST /api/cuentas-por-pagar
// @desc    Crear nueva cuenta por pagar
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { proveedor, compra, receiptNumber, subtotal, hasIVA, ivaRate, dueDate, notes } = req.body;
    
    // Validar campos requeridos
    if (!proveedor || !compra || !subtotal) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
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

    // Calcular IVA en backend (no confiar en frontend)
    const finalIvaRate = hasIVA ? (ivaRate || 0.16) : 0;
    const ivaAmount = hasIVA ? Math.round((subtotal * finalIvaRate) * 100) / 100 : 0;
    const total = Math.round((subtotal + ivaAmount) * 100) / 100;

    // Crear cuenta por pagar
    const cuenta = await CuentaPorPagar.create({
      proveedor,
      compra,
      receiptNumber,
      hasIVA: hasIVA || false,
      ivaRate: finalIvaRate,
      subtotal,
      ivaAmount,
      monto: total,
      montoBase: subtotal,
      saldo: total,
      dueDate,
      notes
    });

    // Populate para respuesta
    await cuenta.populate('proveedor', 'name contact phone');
    await cuenta.populate('compra', 'invoice date total');

    res.status(201).json({
      success: true,
      data: cuenta,
      message: 'Cuenta por pagar creada correctamente'
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
      message: 'Error al crear cuenta por pagar'
    });
  }
});

// @route   POST /api/cuentas-por-pagar/pagar-masivo
// @desc    Pagar múltiples cuentas por pagar
router.post('/pagar-masivo', authenticateToken, async (req, res) => {
  const session = await CuentaPorPagar.startSession();
  session.startTransaction();
  
  try {
    const { cuentaIds, paymentMethod, user, notes } = req.body;
    
    // Validaciones
    if (!cuentaIds || !Array.isArray(cuentaIds) || cuentaIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos una cuenta'
      });
    }
    
    if (!paymentMethod || !user) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }
    
    // Obtener todas las cuentas
    const cuentas = await CuentaPorPagar.find({ _id: { $in: cuentaIds } }).session(session);
    
    if (cuentas.length !== cuentaIds.length) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Algunas cuentas no fueron encontradas'
      });
    }
    
    // Validar que todas estén pendientes
    const cuentasNoPendientes = cuentas.filter(c => c.status !== 'pendiente');
    if (cuentasNoPendientes.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Algunas cuentas ya están pagadas o canceladas'
      });
    }
    
    // Calcular totales desde backend (no confiar en frontend)
    let subtotalTotal = 0;
    let ivaTotal = 0;
    let totalAPagar = 0;
    
    for (const cuenta of cuentas) {
      subtotalTotal += cuenta.subtotal || cuenta.montoBase || cuenta.monto;
      ivaTotal += cuenta.ivaAmount || 0;
      totalAPagar += cuenta.saldo;
    }
    
    // Procesar pagos
    const resultados = [];
    for (const cuenta of cuentas) {
      // Registrar pago
      await cuenta.addPayment(cuenta.saldo, paymentMethod, user, notes);
      
      // Actualizar deuda del proveedor
      if (cuenta.proveedor) {
        const proveedor = await Proveedor.findById(cuenta.proveedor).session(session);
        if (proveedor) {
          proveedor.currentDebt -= cuenta.saldo;
          if (proveedor.currentDebt < 0) {
            proveedor.currentDebt = 0;
          }
          await proveedor.save({ session });
        }
      }
      
      resultados.push({
        cuentaId: cuenta._id,
        montoPagado: cuenta.saldo,
        estado: 'pagado'
      });
    }
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: {
        cuentasPagadas: resultados.length,
        subtotal: subtotalTotal,
        iva: ivaTotal,
        total: totalAPagar,
        resultados
      },
      message: `${resultados.length} cuentas pagadas correctamente`
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error en pago masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar pago masivo'
    });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/cuentas-por-pagar/overdue
// @desc    Obtener cuentas vencidas
router.get('/overdue', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    
    const cuentas = await CuentaPorPagar.find({
      status: 'pendiente',
      dueDate: { $lt: today }
    })
      .populate('proveedor', 'name contact phone')
      .populate('compra', 'invoice date total')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: cuentas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuentas vencidas'
    });
  }
});

// @route   GET /api/cuentas-por-pagar/upcoming
// @desc    Obtener cuentas próximas a vencer (próximos 7 días)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);
    
    const cuentas = await CuentaPorPagar.find({
      status: 'pendiente',
      dueDate: { $gte: today, $lte: next7Days }
    })
      .populate('proveedor', 'name contact phone')
      .populate('compra', 'invoice date total')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: cuentas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuentas próximas'
    });
  }
});

// @route   GET /api/cuentas-por-pagar/due-tomorrow
// @desc    Obtener cuentas que vencen mañana (para alertas)
router.get('/due-tomorrow', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    // Inicio y fin del día de mañana
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    const cuentas = await CuentaPorPagar.find({
      status: 'pendiente',
      dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow }
    })
      .populate('proveedor', 'name contact phone')
      .populate('compra', 'invoice date total')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: cuentas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuentas que vencen mañana'
    });
  }
});

// @route   GET /api/cuentas-por-pagar/:id
// @desc    Obtener cuenta por pagar por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const cuenta = await CuentaPorPagar.findById(req.params.id)
      .populate('proveedor', 'name contact phone email creditDays')
      .populate('compra', 'invoice date total baseTotal totalDiscount discountDeadline items')
      .populate('payments.user', 'name');
    
    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    // Verificar disponibilidad de descuento
    const discountInfo = cuenta.checkDiscountAvailability();
    
    res.json({
      success: true,
      data: {
        ...cuenta.toObject(),
        discountInfo
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuenta'
    });
  }
});

// @route   PATCH /api/cuentas-por-pagar/:id/pagar
// @desc    Realizar pago parcial o total de cuenta
router.patch('/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod, user, notes } = req.body;
    
    const cuenta = await CuentaPorPagar.findById(req.params.id)
      .populate('proveedor');
    
    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    if (cuenta.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'La cuenta ya está pagada'
      });
    }

    if (amount > cuenta.saldo) {
      return res.status(400).json({
        success: false,
        message: 'El monto excede el saldo pendiente'
      });
    }

    // Registrar pago
    await cuenta.addPayment(amount, paymentMethod, user, notes);

    // Actualizar deuda del proveedor
    if (cuenta.proveedor) {
      cuenta.proveedor.currentDebt -= amount;
      if (cuenta.proveedor.currentDebt < 0) {
        cuenta.proveedor.currentDebt = 0;
      }
      await cuenta.proveedor.save();
    }

    // Obtener cuenta actualizada
    await cuenta.populate('proveedor', 'name contact phone');
    await cuenta.populate('compra', 'invoice date total');
    await cuenta.populate('payments.user', 'name');

    res.json({
      success: true,
      data: cuenta,
      message: `Pago de $${amount} registrado correctamente`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar pago'
    });
  }
});

// @route   PATCH /api/cuentas-por-pagar/:id/status
// @desc    Actualizar estado de cuenta
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const cuenta = await CuentaPorPagar.findById(req.params.id);
    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    cuenta.status = status;
    await cuenta.save();

    await cuenta.populate('proveedor', 'name contact phone');
    await cuenta.populate('compra', 'invoice date total');

    res.json({
      success: true,
      data: cuenta
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado'
    });
  }
});

// @route   GET /api/cuentas-por-pagar/summary
// @desc    Obtener resumen de cuentas por pagar
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const totalPending = await CuentaPorPagar.aggregate([
      { $match: { status: 'pendiente' } },
      { $group: { _id: null, total: { $sum: '$saldo' } } }
    ]);

    const overdueTotal = await CuentaPorPagar.aggregate([
      { $match: { status: 'pendiente', dueDate: { $lt: today } } },
      { $group: { _id: null, total: { $sum: '$saldo' } } }
    ]);

    const next7DaysTotal = await CuentaPorPagar.aggregate([
      { $match: { status: 'pendiente', dueDate: { $gte: today, $lte: next7Days } } },
      { $group: { _id: null, total: { $sum: '$saldo' } } }
    ]);

    const next30DaysTotal = await CuentaPorPagar.aggregate([
      { $match: { status: 'pendiente', dueDate: { $gte: today, $lte: next30Days } } },
      { $group: { _id: null, total: { $sum: '$saldo' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalPending: totalPending[0]?.total || 0,
        overdueTotal: overdueTotal[0]?.total || 0,
        next7DaysTotal: next7DaysTotal[0]?.total || 0,
        next30DaysTotal: next30DaysTotal[0]?.total || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen'
    });
  }
});

module.exports = router;

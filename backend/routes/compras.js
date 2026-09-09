const express = require('express');
const Compra = require('../models/Compra');
const Producto = require('../models/Producto');
const Proveedor = require('../models/Proveedor');
const CuentaPorPagar = require('../models/CuentaPorPagar');
const Recordatorio = require('../models/Recordatorio');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getCurrentDateGMT7 } = require('../helpers/timezone');
const router = express.Router();

// Helper para parsear fecha YYYY-MM-DD como fecha local (no UTC)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// @route   GET /api/compras
// @desc    Obtener todas las compras
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { proveedor, status, sku, type, page = 1, limit = 10 } = req.query;
    let query = {};

    if (proveedor) query.proveedor = proveedor;
    if (status) query.status = status;
    if (type) query.type = type;

    // Filtro por SKU (busca en items de la compra)
    if (sku) {
      // Buscar productos que coincidan con el SKU
      const productos = await Producto.find({ 
        sku: { $regex: sku, $options: 'i' } 
      }).select('_id');
      
      const productoIds = productos.map(p => p._id);
      
      if (productoIds.length > 0) {
        query['items.product'] = { $in: productoIds };
      } else {
        // Si no hay productos con ese SKU, retornar vacío
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    }

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
router.get('/:id', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { proveedor, items, type, paymentMethod, user, notes, invoice, receiptNumber, hasIVA, ivaRate, date } = req.body;

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

      // Calcular baseUnitCost y unitCost según si el costo incluye IVA
      let baseUnitCost;
      let unitCostToSave;

      if (item.costIncludesTax === true) {
        // IVA incluido: desglosar
        const totalWithTax = Number(item.unitCost) || 0;
        const taxRate = Number(item.taxRate) || 0.16;
        baseUnitCost = totalWithTax / (1 + taxRate);
        unitCostToSave = totalWithTax;
      } else {
        // IVA no incluido: comportamiento actual
        baseUnitCost = item.unitCost || (supplierProduct?.baseCost || producto.cost);
        unitCostToSave = baseUnitCost;
      }
      
      // Autocompletar condiciones de descuento
      const processedItem = {
        product: item.product,
        quantity: item.quantity,
        baseUnitCost: baseUnitCost,
        unitCost: unitCostToSave,
        discountPercentage: supplierProduct?.discountPercentage || 0,
        discountDays: supplierProduct?.discountDays || 0,
        discountApplied: false,
        hasTax: item.hasTax !== undefined ? item.hasTax : true,
        taxRate: item.taxRate !== undefined ? item.taxRate : 0.16,
        costIncludesTax: item.costIncludesTax || false
      };

      processedItems.push(processedItem);

      // Actualizar stock y costo del producto
      producto.stock += item.quantity;
      producto.cost = baseUnitCost;
      await producto.save();
    }

    // Calcular fecha de vencimiento para compras a crédito
    let dueDate;
    let earlyPaymentDiscount = 0;
    let discountDeadline;
    
    if (type === 'credito') {
      // Usar la fecha de compra proporcionada por el usuario, o la fecha actual si no se especifica
      const { getCurrentDateGMT7 } = require('../helpers/timezone');
      const purchaseDate = date ? parseLocalDate(date) : getCurrentDateGMT7();
      
      dueDate = new Date(purchaseDate);
      dueDate.setDate(dueDate.getDate() + proveedorDoc.creditDays);
      
      // Aplicar descuento por pronto pago del proveedor
      earlyPaymentDiscount = proveedorDoc.earlyPaymentDiscount || 0;
      
      // Establecer fecha límite de descuento (misma que fecha de vencimiento)
      if (earlyPaymentDiscount > 0) {
        discountDeadline = new Date(purchaseDate);
        discountDeadline.setDate(discountDeadline.getDate() + proveedorDoc.creditDays);
      }
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
      invoice,
      earlyPaymentDiscount,
      discountDeadline,
      // Usar fecha personalizada si se proporciona, si no usa el default del modelo
      ...(date && { date: parseLocalDate(date) })
    });

    // Si es a crédito, crear cuenta por pagar
    if (type === 'credito') {
      try {
        // Calcular IVA total desde los items de la compra
        const totalIVA = compra.totalIVA || 0;
        const totalConIVA = compra.total || compra.baseTotal;

        // Verificar si ya existe una cuenta por pagar para esta compra
        const existingAccount = await CuentaPorPagar.findOne({ compra: compra._id });
        if (existingAccount) {
          console.log(`Cuenta por pagar ya existe para compra ${compra._id}, no se crea duplicado`);
        } else {
          // Calcular el saldo inicial basado en el importe exigible (con descuento si aplica)
          const saldoInicial = compra.totalDiscount > 0 ? compra.total : compra.baseTotal;
          
          await CuentaPorPagar.create({
            proveedor,
            compra: compra._id,
            receiptNumber,
            hasIVA: totalIVA > 0,
            ivaRate: 0.16, // Tasa promedio, el IVA real está en totalIVA
            subtotal: compra.baseTotal,
            ivaAmount: totalIVA,
            monto: totalConIVA,
            montoBase: compra.baseTotal,
            descuentoDisponible: compra.totalDiscount,
            discountDeadline: compra.discountDeadline,
            saldo: saldoInicial,
            dueDate,
            notes: `Cuenta generada por compra ${compra._id}`
          });
          console.log(`Cuenta por pagar creada exitosamente para compra ${compra._id}`);
        }

        // Crear recordatorio automático para el pago
        try {
          await Recordatorio.create({
            title: `Pago a proveedor - ${proveedorDoc.name}`,
            description: `Pago de cuenta por compra ${receiptNumber || compra._id} por $${totalConIVA.toFixed(2)}`,
            date: dueDate,
            type: 'pago',
            priority: 'alta',
            relatedId: proveedor,
            relatedModel: 'Proveedor',
            status: 'pendiente',
            user: user
          });
        } catch (reminderError) {
          console.error('Error al crear recordatorio automático:', reminderError);
          // No fallar la compra si falla el recordatorio
        }

        // Actualizar deuda del proveedor con el total con IVA
        proveedorDoc.currentDebt += totalConIVA;
        await proveedorDoc.save();
      } catch (accountError) {
        console.error('Error al crear cuenta por pagar:', accountError);
        // Si falla la creación de cuenta por pagar, revertir la compra
        await Compra.findByIdAndDelete(compra._id);
        return res.status(500).json({
          success: false,
          message: 'Error al crear cuenta por pagar. La compra fue revertida.',
          error: accountError.message
        });
      }
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
// @desc    Actualizar compra (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      proveedor, 
      items, 
      type, 
      hasIVA, 
      ivaRate, 
      notes, 
      invoice,
      paymentMethod,
      earlyPaymentDiscount,
      discountDeadline,
      dueDate,
      date
    } = req.body;
    
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
        message: 'No se puede modificar una compra cancelada'
      });
    }

    // Verificar si la compra tiene CuentaPorPagar con pagos
    const cuentaPorPagar = await CuentaPorPagar.findOne({ compra: compra._id });
    if (cuentaPorPagar && cuentaPorPagar.payments && cuentaPorPagar.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta compra tiene pagos registrados y no puede modificarse'
      });
    }

    // Guardar items originales para ajustar inventario
    const originalItems = compra.items;
    const originalType = compra.type;
    const originalProveedor = compra.proveedor;

    // Si se modifican items, ajustar inventario
    if (items) {
      // Helper para obtener valor con fallback explícito (evita tratar 0 como ausente)
      const getValue = (...values) => {
        for (const val of values) {
          if (val !== undefined && val !== null) return val;
        }
        return 0;
      };

      // Validar y normalizar items
      const normalizedItems = items.map(item => ({
        ...item,
        baseUnitCost: getValue(item.baseUnitCost, item.cost, item.unitCost),
        unitCost: getValue(item.unitCost, item.cost, item.baseUnitCost),
        quantity: item.quantity || 1,
        discountPercentage: item.discountPercentage || 0,
        hasTax: item.hasTax !== undefined ? item.hasTax : true,
        taxRate: item.taxRate !== undefined ? item.taxRate : 0.16,
        costIncludesTax: item.costIncludesTax || false
      }));

      // Devolver stock de items originales
      for (const originalItem of originalItems) {
        const producto = await Producto.findById(originalItem.product);
        if (producto) {
          producto.stock -= originalItem.quantity;
          if (producto.stock < 0) producto.stock = 0;
          await producto.save();
        }
      }

      // Verificar y descontar stock de nuevos items
      for (const newItem of normalizedItems) {
        const producto = await Producto.findById(newItem.product);
        if (!producto) {
          // Revertir stock si no existe producto
          for (const originalItem of originalItems) {
            const prod = await Producto.findById(originalItem.product);
            if (prod) {
              prod.stock += originalItem.quantity;
              await prod.save();
            }
          }
          return res.status(404).json({
            success: false,
            message: `Producto con ID ${newItem.product} no encontrado`
          });
        }

        producto.stock += newItem.quantity;
        await producto.save();
      }

      compra.items = normalizedItems;
    }

    // Actualizar otros campos
    if (proveedor !== undefined) compra.proveedor = proveedor;
    if (type !== undefined) compra.type = type;
    if (hasIVA !== undefined) compra.hasIVA = hasIVA;
    if (ivaRate !== undefined) compra.ivaRate = ivaRate;
    if (notes !== undefined) compra.notes = notes;
    if (invoice !== undefined) compra.invoice = invoice;
    if (earlyPaymentDiscount !== undefined) compra.earlyPaymentDiscount = earlyPaymentDiscount;
    if (discountDeadline !== undefined) compra.discountDeadline = discountDeadline;
    if (dueDate !== undefined) compra.dueDate = dueDate;
    if (date !== undefined) compra.date = parseLocalDate(date);

    // Recalcular totales
    compra.baseTotal = Math.round((compra.items.reduce((sum, item) => {
      const cost = getValue(item.baseUnitCost, item.cost, item.unitCost);
      const qty = item.quantity || 1;
      return sum + (qty * cost);
    }, 0)) * 100) / 100;
    
    compra.totalDiscount = Math.round((compra.items.reduce((sum, item) => {
      const cost = getValue(item.baseUnitCost, item.cost, item.unitCost);
      const qty = item.quantity || 1;
      const discountPct = item.discountPercentage || 0;
      return sum + (qty * cost * (discountPct / 100));
    }, 0)) * 100) / 100;
    
    // Calcular IVA total por item
    const totalIVA = Math.round((compra.items.reduce((sum, item) => {
      const cost = getValue(item.baseUnitCost, item.cost, item.unitCost);
      const qty = item.quantity || 1;
      const discountPct = item.discountPercentage || 0;
      const subtotal = (qty * cost) - (qty * cost * (discountPct / 100));
      const itemTax = (item.hasTax !== false) ? (subtotal * (item.taxRate || 0.16)) : 0;
      return sum + itemTax;
    }, 0)) * 100) / 100;
    
    compra.totalIVA = totalIVA;
    compra.total = Math.round((compra.baseTotal - compra.totalDiscount + totalIVA) * 100) / 100;

    await compra.save();

    // Manejo de CuentaPorPagar
    if (type === 'credito' && originalType === 'contado') {
      // Cambio de contado a crédito: crear CuentaPorPagar
      const proveedorDoc = await Proveedor.findById(compra.proveedor);
      if (!proveedorDoc) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      const totalIVA = compra.totalIVA || 0;
      const totalConIVA = compra.total || compra.baseTotal;
      const saldoInicial = compra.totalDiscount > 0 ? compra.total : compra.baseTotal;

      await CuentaPorPagar.create({
        proveedor: compra.proveedor,
        compra: compra._id,
        receiptNumber: compra.invoice,
        hasIVA: totalIVA > 0,
        ivaRate: 0.16,
        subtotal: compra.baseTotal,
        ivaAmount: totalIVA,
        monto: totalConIVA,
        montoBase: compra.baseTotal,
        descuentoDisponible: compra.totalDiscount,
        discountDeadline: compra.discountDeadline,
        saldo: saldoInicial,
        dueDate: compra.dueDate,
        notes: `Cuenta generada por compra ${compra._id}`
      });

      // Actualizar deuda del proveedor
      proveedorDoc.currentDebt += totalConIVA;
      await proveedorDoc.save();
    } else if (type === 'contado' && originalType === 'credito') {
      // Cambio de crédito a contado: cancelar CuentaPorPagar
      if (cuentaPorPagar) {
        cuentaPorPagar.status = 'cancelada';
        cuentaPorPagar.saldo = 0;
        await cuentaPorPagar.save();

        // Actualizar deuda del proveedor
        const proveedorDoc = await Proveedor.findById(originalProveedor);
        if (proveedorDoc) {
          proveedorDoc.currentDebt -= compra.monto;
          if (proveedorDoc.currentDebt < 0) proveedorDoc.currentDebt = 0;
          await proveedorDoc.save();
        }
      }
    } else if (type === 'credito' && cuentaPorPagar) {
      // Actualizar CuentaPorPagar existente
      const totalIVA = compra.totalIVA || 0;
      const totalConIVA = compra.total || compra.baseTotal;
      const saldoInicial = compra.totalDiscount > 0 ? compra.total : compra.baseTotal;

      cuentaPorPagar.proveedor = compra.proveedor;
      cuentaPorPagar.subtotal = compra.baseTotal;
      cuentaPorPagar.ivaAmount = totalIVA;
      cuentaPorPagar.monto = totalConIVA;
      cuentaPorPagar.montoBase = compra.baseTotal;
      cuentaPorPagar.descuentoDisponible = compra.totalDiscount;
      cuentaPorPagar.discountDeadline = compra.discountDeadline;
      cuentaPorPagar.saldo = saldoInicial;
      cuentaPorPagar.dueDate = compra.dueDate;
      await cuentaPorPagar.save();

      // Actualizar deuda del proveedor si cambió el proveedor o el total
      if (proveedor !== undefined || items) {
        const proveedorDoc = await Proveedor.findById(compra.proveedor);
        if (proveedorDoc) {
          if (proveedor !== undefined) {
            // Cambió el proveedor: ajustar deuda de ambos
            const oldProveedor = await Proveedor.findById(originalProveedor);
            if (oldProveedor) {
              oldProveedor.currentDebt -= (compra.monto || 0);
              if (oldProveedor.currentDebt < 0 || isNaN(oldProveedor.currentDebt)) oldProveedor.currentDebt = 0;
              await oldProveedor.save();
            }
            proveedorDoc.currentDebt += (totalConIVA || 0);
          } else {
            // Solo cambió el total: ajustar deuda del mismo proveedor
            const oldMonto = compra.monto || 0;
            const newMonto = totalConIVA || 0;
            proveedorDoc.currentDebt = proveedorDoc.currentDebt - oldMonto + newMonto;
          }
          if (proveedorDoc.currentDebt < 0 || isNaN(proveedorDoc.currentDebt)) proveedorDoc.currentDebt = 0;
          await proveedorDoc.save();
        }
      }
    }

    await compra.populate('proveedor', 'name contact phone');
    await compra.populate('user', 'name');
    await compra.populate('items.product', 'name sku');

    res.json({
      success: true,
      data: compra,
      message: 'Compra actualizada correctamente'
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

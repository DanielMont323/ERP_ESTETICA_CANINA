const express = require('express');
const Venta = require('../models/Venta');
const Compra = require('../models/Compra');
const Costo = require('../models/Costo');
const CuentaPorPagar = require('../models/CuentaPorPagar');
const Producto = require('../models/Producto');
const Servicio = require('../models/Servicio');
const Cliente = require('../models/Cliente');
const Proveedor = require('../models/Proveedor');
const Recordatorio = require('../models/Recordatorio');
const { startOfDayGMT7, endOfDayGMT7, toGMT7 } = require('../helpers/timezone');
const ExcelJS = require('exceljs');
const router = express.Router();

// @route   GET /api/reports/income-statement
// @desc    Estado de resultados
router.get('/income-statement', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // Filtros de periodo predefinidos usando GMT-7
    const todayGMT7 = startOfDayGMT7(new Date());
    
    if (period === 'day' || period === 'today') {
      const endOfToday = endOfDayGMT7(new Date());
      dateFilter = {
        date: { $gte: todayGMT7, $lte: endOfToday }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(todayGMT7);
      startOfWeek.setDate(todayGMT7.getDate() - todayGMT7.getDay());
      const startOfWeekGMT7 = startOfDayGMT7(startOfWeek);
      const endOfWeek = new Date(startOfWeekGMT7);
      endOfWeek.setDate(startOfWeekGMT7.getDate() + 6);
      const endOfWeekGMT7 = endOfDayGMT7(endOfWeek);
      dateFilter = {
        date: { $gte: startOfWeekGMT7, $lte: endOfWeekGMT7 }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth(), 1);
      const startOfMonthGMT7 = startOfDayGMT7(startOfMonth);
      const endOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth() + 1, 0);
      const endOfMonthGMT7 = endOfDayGMT7(endOfMonth);
      dateFilter = {
        date: { $gte: startOfMonthGMT7, $lte: endOfMonthGMT7 }
      };
    } else if (period === 'year') {
      const startOfYear = new Date(todayGMT7.getFullYear(), 0, 1);
      const startOfYearGMT7 = startOfDayGMT7(startOfYear);
      const endOfYear = new Date(todayGMT7.getFullYear(), 11, 31);
      const endOfYearGMT7 = endOfDayGMT7(endOfYear);
      dateFilter = {
        date: { $gte: startOfYearGMT7, $lte: endOfYearGMT7 }
      };
    } else if (startDate && endDate) {
      const startGMT7 = startOfDayGMT7(new Date(startDate));
      const endGMT7 = endOfDayGMT7(new Date(endDate));
      dateFilter = {
        date: { $gte: startGMT7, $lte: endGMT7 }
      };
    }

    // Ingresos por ventas
    const ventas = await Venta.find({
      ...dateFilter,
      status: 'completada'
    });

    const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const totalComision = ventas.reduce((sum, venta) => sum + venta.commission, 0);
    const totalIngresoNeto = ventas.reduce((sum, venta) => sum + venta.netIncome, 0);

    // Costos variables (compras)
    const compras = await Compra.find({
      ...dateFilter,
      type: 'contado'
    });

    const totalCompras = compras.reduce((sum, compra) => sum + compra.total, 0);

    // Costos fijos y variables
    const costos = await Costo.find({
      ...dateFilter,
      isActive: true
    });

    const costosFijos = costos
      .filter(costo => costo.type === 'fijo')
      .reduce((sum, costo) => sum + costo.amount, 0);

    const costosVariables = costos
      .filter(costo => costo.type === 'variable')
      .reduce((sum, costo) => sum + costo.amount, 0);

    // Cálculos
    const ingresoBruto = totalIngresoNeto;
    const costoVentas = totalCompras + costosVariables;
    const utilidadBruta = ingresoBruto - costoVentas;
    const utilidadOperativa = utilidadBruta - costosFijos;
    const margenBruto = ingresoBruto > 0 ? (utilidadBruta / ingresoBruto * 100) : 0;
    const margenOperativo = ingresoBruto > 0 ? (utilidadOperativa / ingresoBruto * 100) : 0;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        ingresos: {
          totalVentas,
          totalComision,
          totalIngresoNeto
        },
        costos: {
          totalCompras,
          costosFijos,
          costosVariables,
          totalCostos: totalCompras + costosFijos + costosVariables
        },
        utilidad: {
          ingresoBruto,
          costoVentas,
          utilidadBruta,
          utilidadOperativa,
          margenBruto: margenBruto.toFixed(2),
          margenOperativo: margenOperativo.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al generar estado de resultados'
    });
  }
});

// @route   GET /api/reports/sales-summary
// @desc    Resumen de ventas
router.get('/sales-summary', async (req, res) => {
  try {
    const { period, startDate, endDate, category } = req.query;
    
    let dateFilter = {};
    
    // Filtros de periodo predefinidos usando GMT-7
    const todayGMT7 = startOfDayGMT7(new Date());
    
    if (period === 'day' || period === 'today') {
      const endOfToday = endOfDayGMT7(new Date());
      dateFilter = {
        date: { $gte: todayGMT7, $lte: endOfToday }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(todayGMT7);
      startOfWeek.setDate(todayGMT7.getDate() - todayGMT7.getDay());
      const startOfWeekGMT7 = startOfDayGMT7(startOfWeek);
      const endOfWeek = new Date(startOfWeekGMT7);
      endOfWeek.setDate(startOfWeekGMT7.getDate() + 6);
      const endOfWeekGMT7 = endOfDayGMT7(endOfWeek);
      dateFilter = {
        date: { $gte: startOfWeekGMT7, $lte: endOfWeekGMT7 }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth(), 1);
      const startOfMonthGMT7 = startOfDayGMT7(startOfMonth);
      const endOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth() + 1, 0);
      const endOfMonthGMT7 = endOfDayGMT7(endOfMonth);
      dateFilter = {
        date: { $gte: startOfMonthGMT7, $lte: endOfMonthGMT7 }
      };
    } else if (period === 'year') {
      const startOfYear = new Date(todayGMT7.getFullYear(), 0, 1);
      const startOfYearGMT7 = startOfDayGMT7(startOfYear);
      const endOfYear = new Date(todayGMT7.getFullYear(), 11, 31);
      const endOfYearGMT7 = endOfDayGMT7(endOfYear);
      dateFilter = {
        date: { $gte: startOfYearGMT7, $lte: endOfYearGMT7 }
      };
    } else if (startDate && endDate) {
      const startGMT7 = startOfDayGMT7(new Date(startDate));
      const endGMT7 = endOfDayGMT7(new Date(endDate));
      dateFilter = {
        date: { $gte: startGMT7, $lte: endGMT7 }
      };
    }

    let groupFormat;
    if (period === 'day' || period === 'today') {
      groupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' }
      };
    } else if (period === 'month') {
      groupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' }
      };
    } else {
      groupFormat = {
        year: { $year: '$date' }
      };
    }

    // Filtro por categoría de producto
    let categoryFilter = {};
    if (category) {
      const productos = await Producto.find({ category }).select('_id');
      const productIds = productos.map(p => p._id);
      categoryFilter = {
        'items.item': { $in: productIds },
        'items.type': 'producto'
      };
    }

    const salesByPeriod = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          ...categoryFilter
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: '$total' },
          totalCommission: { $sum: '$commission' },
          totalNetIncome: { $sum: '$netIncome' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const topProducts = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          'items.type': 'producto',
          ...categoryFilter
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.type': 'producto' } },
      {
        $group: {
          _id: '$items.item',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    const salesByPaymentMethod = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          ...categoryFilter
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const salesByChannel = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          ...categoryFilter
        }
      },
      {
        $group: {
          _id: '$saleChannel',
          total: { $sum: '$total' },
          netIncome: { $sum: '$netIncome' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        salesByPeriod,
        topProducts,
        salesByPaymentMethod,
        salesByChannel
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al generar resumen de ventas'
    });
  }
});

// @route   GET /api/reports/sales-behavior
// @desc    Comportamiento de ventas (ticket promedio, unidades, canal principal, etc.)
router.get('/sales-behavior', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // Filtros de periodo predefinidos usando GMT-7
    const todayGMT7 = startOfDayGMT7(new Date());
    
    if (period === 'day' || period === 'today') {
      const endOfToday = endOfDayGMT7(new Date());
      dateFilter = {
        date: { $gte: todayGMT7, $lte: endOfToday }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(todayGMT7);
      startOfWeek.setDate(todayGMT7.getDate() - todayGMT7.getDay());
      const startOfWeekGMT7 = startOfDayGMT7(startOfWeek);
      const endOfWeek = new Date(startOfWeekGMT7);
      endOfWeek.setDate(startOfWeekGMT7.getDate() + 6);
      const endOfWeekGMT7 = endOfDayGMT7(endOfWeek);
      dateFilter = {
        date: { $gte: startOfWeekGMT7, $lte: endOfWeekGMT7 }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth(), 1);
      const startOfMonthGMT7 = startOfDayGMT7(startOfMonth);
      const endOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth() + 1, 0);
      const endOfMonthGMT7 = endOfDayGMT7(endOfMonth);
      dateFilter = {
        date: { $gte: startOfMonthGMT7, $lte: endOfMonthGMT7 }
      };
    } else if (period === 'year') {
      const startOfYear = new Date(todayGMT7.getFullYear(), 0, 1);
      const startOfYearGMT7 = startOfDayGMT7(startOfYear);
      const endOfYear = new Date(todayGMT7.getFullYear(), 11, 31);
      const endOfYearGMT7 = endOfDayGMT7(endOfYear);
      dateFilter = {
        date: { $gte: startOfYearGMT7, $lte: endOfYearGMT7 }
      };
    } else if (startDate && endDate) {
      const startGMT7 = startOfDayGMT7(new Date(startDate));
      const endGMT7 = endOfDayGMT7(new Date(endDate));
      dateFilter = {
        date: { $gte: startGMT7, $lte: endGMT7 }
      };
    }

    const ventas = await Venta.find({
      ...dateFilter,
      status: 'completada'
    });

    const totalVentas = ventas.length;
    const totalMonto = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const totalIngresoNeto = ventas.reduce((sum, venta) => sum + venta.netIncome, 0);
    
    // Calcular unidades vendidas
    const totalUnidades = ventas.reduce((sum, venta) => {
      return sum + venta.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Ticket promedio
    const ticketPromedio = totalVentas > 0 ? totalMonto / totalVentas : 0;

    // Canal principal
    const salesByChannel = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada'
        }
      },
      {
        $group: {
          _id: '$saleChannel',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const canalPrincipal = salesByChannel.length > 0 ? salesByChannel[0]._id : null;

    // Método de pago principal
    const salesByPaymentMethod = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const metodoPagoPrincipal = salesByPaymentMethod.length > 0 ? salesByPaymentMethod[0]._id : null;

    // Producto más vendido
    const topProduct = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          'items.type': 'producto'
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.type': 'producto' } },
      {
        $group: {
          _id: '$items.item',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 }
    ]);

    const productoMasVendido = topProduct.length > 0 ? topProduct[0].name : null;

    res.json({
      success: true,
      data: {
        totalVentas,
        totalMonto,
        totalIngresoNeto,
        totalUnidades,
        ticketPromedio,
        canalPrincipal,
        metodoPagoPrincipal,
        productoMasVendido,
        salesByChannel,
        salesByPaymentMethod
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al generar comportamiento de ventas'
    });
  }
});

// @route   GET /api/reports/inventory
// @desc    Reporte de inventario
router.get('/inventory', async (req, res) => {
  try {
    const { category } = req.query;
    
    let categoryFilter = {};
    if (category) {
      categoryFilter = { category };
    }

    const productos = await Producto.find({ 
      isActive: true,
      ...categoryFilter
    })
      .populate('category', 'name')
      .select('name category cost price stock minStock sku');

    const totalProducts = productos.length;
    const totalStockValue = productos.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const totalSalesValue = productos.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockProducts = productos.filter(p => p.stock <= p.minStock);
    const outOfStockProducts = productos.filter(p => p.stock === 0);

    const inventoryByCategory = await Producto.aggregate([
      { $match: { isActive: true, ...categoryFilter } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$cost'] } }
        }
      }
    ]);

    const topValueProducts = productos
      .sort((a, b) => (b.stock * b.cost) - (a.stock * a.cost))
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        unitCost: p.cost,
        totalValue: p.stock * p.cost
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalStockValue,
          totalSalesValue,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length
        },
        lowStockProducts,
        outOfStockProducts,
        inventoryByCategory,
        topValueProducts
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de inventario'
    });
  }
});

// @route   GET /api/reports/customers
// @desc    Reporte de clientes
router.get('/customers', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // Filtros de periodo predefinidos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (period === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = {
        date: { $gte: today, $lt: tomorrow }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      dateFilter = {
        date: { $gte: startOfWeek, $lt: endOfWeek }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      dateFilter = {
        date: { $gte: startOfMonth, $lte: endOfMonth }
      };
    } else if (period === 'year') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      dateFilter = {
        date: { $gte: startOfYear, $lte: endOfYear }
      };
    } else if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const totalCustomers = await Cliente.countDocuments({ isActive: true });
    const newCustomers = await Cliente.countDocuments({
      isActive: true,
      createdAt: dateFilter.date || {}
    });

    const topCustomers = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada',
          customer: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          purchaseCount: { $sum: 1 },
          avgPurchase: { $avg: '$total' }
        }
      },
      {
        $lookup: {
          from: 'clientes',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          name: '$customer.name',
          phone: '$customer.phone',
          totalSpent: 1,
          purchaseCount: 1,
          avgPurchase: { $round: ['$avgPurchase', 2] }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    const customerRetention = await Venta.aggregate([
      {
        $match: {
          status: 'completada',
          customer: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$customer',
          firstPurchase: { $min: '$date' },
          lastPurchase: { $max: '$date' },
          purchaseCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          newCustomers: {
            $sum: { $cond: [{ $eq: ['$purchaseCount', 1] }, 1, 0] }
          },
          returningCustomers: {
            $sum: { $cond: [{ $gt: ['$purchaseCount', 1] }, 1, 0] }
          },
          totalCustomers: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          newCustomers,
          retentionData: customerRetention[0] || {}
        },
        topCustomers
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de clientes'
    });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Datos para dashboard principal
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Ventas del mes actual
    const currentMonthSales = await Venta.find({
      date: { $gte: startOfMonth },
      status: 'completada'
    });

    const currentMonthTotal = currentMonthSales.reduce((sum, sale) => sum + sale.total, 0);
    const currentMonthCount = currentMonthSales.length;

    // Ventas del mes anterior
    const lastMonthSales = await Venta.find({
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: 'completada'
    });

    const lastMonthTotal = lastMonthSales.reduce((sum, sale) => sum + sale.total, 0);
    const lastMonthCount = lastMonthSales.length;

    // Productos con bajo stock
    const lowStockProducts = await Producto.countDocuments({
      $expr: { $lte: ['$stock', '$minStock'] },
      isActive: true
    });

    // Cuentas por pagar vencidas
    const overdueAccounts = await CuentaPorPagar.countDocuments({
      status: 'pendiente',
      dueDate: { $lt: today }
    });

    // Recordatorios pendientes hoy
    const todayReminders = await Recordatorio.countDocuments({
      date: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999))
      },
      status: 'pendiente'
    });

    // Crecimientos
    const salesGrowth = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(2)
      : 0;

    const salesCountGrowth = lastMonthCount > 0
      ? ((currentMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        sales: {
          currentMonth: {
            total: currentMonthTotal,
            count: currentMonthCount
          },
          lastMonth: {
            total: lastMonthTotal,
            count: lastMonthCount
          },
          growth: {
            total: parseFloat(salesGrowth),
            count: parseFloat(salesCountGrowth)
          }
        },
        alerts: {
          lowStockProducts,
          overdueAccounts,
          todayReminders
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard'
    });
  }
});

// @route   GET /api/reports/export-sales
// @desc    Exportar ventas a Excel
router.get('/export-sales', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // Filtros de periodo predefinidos usando GMT-7
    const todayGMT7 = startOfDayGMT7(new Date());
    
    if (period === 'day' || period === 'today') {
      const endOfToday = endOfDayGMT7(new Date());
      dateFilter = {
        date: { $gte: todayGMT7, $lte: endOfToday }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(todayGMT7);
      startOfWeek.setDate(todayGMT7.getDate() - todayGMT7.getDay());
      const startOfWeekGMT7 = startOfDayGMT7(startOfWeek);
      const endOfWeek = new Date(startOfWeekGMT7);
      endOfWeek.setDate(startOfWeekGMT7.getDate() + 6);
      const endOfWeekGMT7 = endOfDayGMT7(endOfWeek);
      dateFilter = {
        date: { $gte: startOfWeekGMT7, $lte: endOfWeekGMT7 }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth(), 1);
      const startOfMonthGMT7 = startOfDayGMT7(startOfMonth);
      const endOfMonth = new Date(todayGMT7.getFullYear(), todayGMT7.getMonth() + 1, 0);
      const endOfMonthGMT7 = endOfDayGMT7(endOfMonth);
      dateFilter = {
        date: { $gte: startOfMonthGMT7, $lte: endOfMonthGMT7 }
      };
    } else if (period === 'year') {
      const startOfYear = new Date(todayGMT7.getFullYear(), 0, 1);
      const startOfYearGMT7 = startOfDayGMT7(startOfYear);
      const endOfYear = new Date(todayGMT7.getFullYear(), 11, 31);
      const endOfYearGMT7 = endOfDayGMT7(endOfYear);
      dateFilter = {
        date: { $gte: startOfYearGMT7, $lte: endOfYearGMT7 }
      };
    } else if (startDate && endDate) {
      const startGMT7 = startOfDayGMT7(new Date(startDate));
      const endGMT7 = endOfDayGMT7(new Date(endDate));
      dateFilter = {
        date: { $gte: startGMT7, $lte: endGMT7 }
      };
    }

    // Obtener ventas
    const ventas = await Venta.find({
      ...dateFilter,
      status: 'completada'
    })
      .populate('customer', 'name phone')
      .populate('mascota', 'name')
      .populate('user', 'name')
      .sort({ date: -1 });

    // Populate items manualmente
    for (const venta of ventas) {
      for (const item of venta.items) {
        if (item.type === 'producto') {
          const producto = await Producto.findById(item.item).select('name sku');
          item.item = producto;
        } else if (item.type === 'servicio') {
          const servicio = await Servicio.findById(item.item).select('name');
          item.item = servicio;
        }
      }
    }

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP Sistema';
    workbook.created = new Date();

    // Calcular datos financieros
    const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const totalComision = ventas.reduce((sum, venta) => sum + venta.commission, 0);
    const totalIngresoNeto = ventas.reduce((sum, venta) => sum + venta.netIncome, 0);

    // Compras
    const compras = await Compra.find({
      ...dateFilter,
      type: 'contado'
    });
    const totalCompras = compras.reduce((sum, compra) => sum + compra.total, 0);

    // Costos fijos y variables
    const costos = await Costo.find({
      ...dateFilter,
      isActive: true
    });
    const costosFijos = costos
      .filter(costo => costo.type === 'fijo')
      .reduce((sum, costo) => sum + costo.amount, 0);
    const costosVariables = costos
      .filter(costo => costo.type === 'variable')
      .reduce((sum, costo) => sum + costo.amount, 0);
    const totalGastos = totalCompras + costosFijos + costosVariables;

    // Utilidades
    const ingresoBruto = totalIngresoNeto;
    const costoVentas = totalCompras + costosVariables;
    const utilidadBruta = ingresoBruto - costoVentas;
    const utilidadOperativa = utilidadBruta - costosFijos;
    const margenNeto = totalVentas > 0 ? (utilidadOperativa / totalVentas * 100).toFixed(2) : 'N/D';

    // Hoja 1: Resumen
    const resumenWorksheet = workbook.addWorksheet('Resumen');
    resumenWorksheet.columns = [
      { header: 'Concepto', key: 'concepto', width: 30 },
      { header: 'Valor', key: 'valor', width: 20 }
    ];

    resumenWorksheet.getRow(1).font = { bold: true, size: 12 };
    resumenWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Periodo
    const periodStart = startDate || todayGMT7.toISOString().split('T')[0];
    const periodEnd = endDate || todayGMT7.toISOString().split('T')[0];
    resumenWorksheet.addRow({ concepto: 'Periodo', valor: `${periodStart} - ${periodEnd}` });
    resumenWorksheet.addRow({});

    // Ingresos
    resumenWorksheet.addRow({ concepto: 'INGRESOS', valor: '' });
    resumenWorksheet.addRow({ concepto: 'Ventas totales', valor: totalVentas });
    resumenWorksheet.addRow({ concepto: 'Comisiones', valor: totalComision });
    resumenWorksheet.addRow({ concepto: 'Ingreso neto', valor: totalIngresoNeto });
    resumenWorksheet.addRow({});

    // Gastos
    resumenWorksheet.addRow({ concepto: 'GASTOS', valor: '' });
    resumenWorksheet.addRow({ concepto: 'Compras', valor: totalCompras });
    resumenWorksheet.addRow({ concepto: 'Costos fijos', valor: costosFijos });
    resumenWorksheet.addRow({ concepto: 'Costos variables', valor: costosVariables });
    resumenWorksheet.addRow({ concepto: 'Total gastos', valor: totalGastos });
    resumenWorksheet.addRow({});

    // Resultados
    resumenWorksheet.addRow({ concepto: 'RESULTADOS', valor: '' });
    resumenWorksheet.addRow({ concepto: 'Utilidad bruta', valor: utilidadBruta });
    resumenWorksheet.addRow({ concepto: 'Utilidad operativa', valor: utilidadOperativa });
    resumenWorksheet.addRow({ concepto: 'Resultado neto', valor: utilidadOperativa });
    resumenWorksheet.addRow({ concepto: 'Margen neto (%)', valor: margenNeto });

    // Hoja 2: Ventas detalladas
    const worksheet = workbook.addWorksheet('Ventas');
    
    // Encabezados
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'ID Venta', key: 'id', width: 25 },
      { header: 'Cliente', key: 'customer', width: 25 },
      { header: 'Mascota', key: 'pet', width: 20 },
      { header: 'Canal', key: 'channel', width: 20 },
      { header: 'Método de Pago', key: 'paymentMethod', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Comisión', key: 'commission', width: 15 },
      { header: 'Comisión Tarjeta', key: 'cardCommission', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Ingreso Neto', key: 'netIncome', width: 15 },
      { header: 'Notas', key: 'notes', width: 30 }
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Datos de ventas
    const channelNames = {
      'local': 'Local comercial',
      'mercado_libre': 'Mercado Libre',
      'redes_sociales': 'Redes sociales'
    };

    ventas.forEach(venta => {
      worksheet.addRow({
        date: venta.date ? venta.date.toLocaleDateString('es-MX') : '',
        id: venta._id.toString(),
        customer: venta.customer?.name || 'Cliente general',
        pet: venta.mascota?.name || '',
        channel: channelNames[venta.saleChannel] || venta.saleChannel,
        paymentMethod: venta.paymentMethod,
        subtotal: venta.subtotal || 0,
        commission: venta.commission || 0,
        cardCommission: venta.cardCommission || 0,
        total: venta.total || 0,
        netIncome: venta.netIncome || 0,
        notes: venta.notes || ''
      });
    });

    // Hoja 3: Ventas por canal
    const channelWorksheet = workbook.addWorksheet('Ventas por Canal');
    
    // Calcular ventas por canal
    const salesByChannel = {};
    ventas.forEach(venta => {
      const channel = channelNames[venta.saleChannel] || venta.saleChannel;
      if (!salesByChannel[channel]) {
        salesByChannel[channel] = { count: 0, total: 0, commission: 0, netIncome: 0 };
      }
      salesByChannel[channel].count += 1;
      salesByChannel[channel].total += venta.total || 0;
      salesByChannel[channel].commission += venta.commission || 0;
      salesByChannel[channel].netIncome += venta.netIncome || 0;
    });

    channelWorksheet.columns = [
      { header: 'Canal', key: 'channel', width: 25 },
      { header: 'Número de ventas', key: 'count', width: 20 },
      { header: 'Ventas totales', key: 'total', width: 20 },
      { header: 'Comisiones', key: 'commission', width: 20 },
      { header: 'Ingreso neto', key: 'netIncome', width: 20 }
    ];

    channelWorksheet.getRow(1).font = { bold: true, size: 12 };
    channelWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    Object.keys(salesByChannel).forEach(channel => {
      channelWorksheet.addRow({
        channel: channel,
        count: salesByChannel[channel].count,
        total: salesByChannel[channel].total,
        commission: salesByChannel[channel].commission,
        netIncome: salesByChannel[channel].netIncome
      });
    });

    // Hoja 4: Métodos de pago
    const paymentWorksheet = workbook.addWorksheet('Métodos de Pago');
    
    const salesByPaymentMethod = {};
    ventas.forEach(venta => {
      const method = venta.paymentMethod;
      if (!salesByPaymentMethod[method]) {
        salesByPaymentMethod[method] = { count: 0, total: 0 };
      }
      salesByPaymentMethod[method].count += 1;
      salesByPaymentMethod[method].total += venta.total || 0;
    });

    paymentWorksheet.columns = [
      { header: 'Método de Pago', key: 'method', width: 20 },
      { header: 'Número de ventas', key: 'count', width: 20 },
      { header: 'Total', key: 'total', width: 20 },
      { header: 'Porcentaje', key: 'percentage', width: 15 }
    ];

    paymentWorksheet.getRow(1).font = { bold: true, size: 12 };
    paymentWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    Object.keys(salesByPaymentMethod).forEach(method => {
      const percentage = totalVentas > 0 ? (salesByPaymentMethod[method].total / totalVentas * 100).toFixed(2) + '%' : '0%';
      paymentWorksheet.addRow({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        count: salesByPaymentMethod[method].count,
        total: salesByPaymentMethod[method].total,
        percentage: percentage
      });
    });

    // Hoja 5: Productos más vendidos
    const productsWorksheet = workbook.addWorksheet('Productos Más Vendidos');
    
    const productsSold = {};
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (item.type === 'producto' && item.item) {
          const productName = item.item.name || 'Producto desconocido';
          if (!productsSold[productName]) {
            productsSold[productName] = { quantity: 0, revenue: 0 };
          }
          productsSold[productName].quantity += item.quantity || 0;
          productsSold[productName].revenue += item.subtotal || 0;
        }
      });
    });

    const sortedProducts = Object.keys(productsSold)
      .map(name => ({
        name,
        quantity: productsSold[name].quantity,
        revenue: productsSold[name].revenue
      }))
      .sort((a, b) => b.quantity - a.quantity);

    productsWorksheet.columns = [
      { header: 'Producto', key: 'name', width: 30 },
      { header: 'Unidades vendidas', key: 'quantity', width: 20 },
      { header: 'Monto generado', key: 'revenue', width: 20 }
    ];

    productsWorksheet.getRow(1).font = { bold: true, size: 12 };
    productsWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    sortedProducts.forEach(product => {
      productsWorksheet.addRow({
        name: product.name,
        quantity: product.quantity,
        revenue: product.revenue
      });
    });

    // Hoja 6: Gastos
    const gastosWorksheet = workbook.addWorksheet('Gastos');
    
    gastosWorksheet.columns = [
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Fecha', key: 'date', width: 15 }
    ];

    gastosWorksheet.getRow(1).font = { bold: true, size: 12 };
    gastosWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Agregar compras
    compras.forEach(compra => {
      gastosWorksheet.addRow({
        type: 'Compra',
        description: `Compra a ${compra.proveedor ? compra.proveedor.toString() : 'Proveedor'}`,
        category: 'Compra',
        amount: compra.total,
        date: compra.date ? compra.date.toLocaleDateString('es-MX') : ''
      });
    });

    // Agregar costos fijos
    costos.filter(c => c.type === 'fijo').forEach(costo => {
      gastosWorksheet.addRow({
        type: 'Costo Fijo',
        description: costo.description,
        category: costo.category,
        amount: costo.amount,
        date: costo.date ? costo.date.toLocaleDateString('es-MX') : ''
      });
    });

    // Agregar costos variables
    costos.filter(c => c.type === 'variable').forEach(costo => {
      gastosWorksheet.addRow({
        type: 'Costo Variable',
        description: costo.description,
        category: costo.category,
        amount: costo.amount,
        date: costo.date ? costo.date.toLocaleDateString('es-MX') : ''
      });
    });

    // Generar nombre de archivo
    const start = startDate || todayGMT7.toISOString().split('T')[0];
    const end = endDate || todayGMT7.toISOString().split('T')[0];
    const fileName = `Reporte_Ventas_${start}_${end}.xlsx`;

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar ventas a Excel'
    });
  }
});

module.exports = router;

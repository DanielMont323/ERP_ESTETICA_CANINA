const express = require('express');
const Venta = require('../models/Venta');
const Compra = require('../models/Compra');
const Costo = require('../models/Costo');
const CuentaPorPagar = require('../models/CuentaPorPagar');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Proveedor = require('../models/Proveedor');
const Recordatorio = require('../models/Recordatorio');
const router = express.Router();

// @route   GET /api/reports/income-statement
// @desc    Estado de resultados
router.get('/income-statement', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
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
    const { period, startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    let groupFormat;
    if (period === 'day') {
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

    const salesByPeriod = await Venta.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'completada'
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
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

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
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        salesByPeriod,
        topProducts,
        salesByPaymentMethod
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

// @route   GET /api/reports/inventory
// @desc    Reporte de inventario
router.get('/inventory', async (req, res) => {
  try {
    const productos = await Producto.find({ isActive: true })
      .select('name category cost price stock minStock sku');

    const totalProducts = productos.length;
    const totalStockValue = productos.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const totalSalesValue = productos.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockProducts = productos.filter(p => p.stock <= p.minStock);
    const outOfStockProducts = productos.filter(p => p.stock === 0);

    const inventoryByCategory = await Producto.aggregate([
      { $match: { isActive: true } },
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
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
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

module.exports = router;

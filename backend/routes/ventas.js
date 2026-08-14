const express = require('express');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const Servicio = require('../models/Servicio');
const Cliente = require('../models/Cliente');
const Mascota = require('../models/Mascota');
const CarnetVacunacion = require('../models/CarnetVacunacion');
const Recordatorio = require('../models/Recordatorio');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getCurrentDateGMT7 } = require('../helpers/timezone');
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, paymentMethod, customer, mascota, user, notes, amountReceived, saleChannel, commission, subtotal, total, netIncome } = req.body;

    // Validar rol ADMIN para edición financiera manual en Mercado Libre
    if (saleChannel === 'mercado_libre' && (subtotal !== undefined || total !== undefined || netIncome !== undefined)) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden modificar valores financieros en ventas de Mercado Libre'
        });
      }
    }

    // 1. Validar que haya items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La venta debe tener al menos un item'
      });
    }

    // 1.5. Detectar si hay vacunas o desparasitantes en la venta
    let hasVaccines = false;
    let hasDewormers = false;
    const vaccineProducts = [];
    const dewormerProducts = [];
    
    for (const item of items) {
      if (item.type === 'producto') {
        const producto = await Producto.findById(item.item);
        if (producto) {
          // Verificar si la categoría es "Vacunas" o "Desparasitantes" (case insensitive)
          // category es Mixed: puede ser String u ObjectId
          let category = producto.category;
          
          // Función para verificar si un string es un ObjectId válido de MongoDB (24 caracteres hex)
          const isObjectId = (str) => {
            return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
          };
          
          if (category && typeof category === 'object') {
            // Si es ObjectId, buscar la categoría por nombre
            const CategoriaProducto = require('../models/CategoriaProducto');
            const categoriaDoc = await CategoriaProducto.findById(category);
            category = categoriaDoc ? categoriaDoc.name : '';
          } else if (category && isObjectId(category)) {
            // Si es String pero parece un ObjectId, buscar en CategoriaProducto
            const CategoriaProducto = require('../models/CategoriaProducto');
            const categoriaDoc = await CategoriaProducto.findById(category);
            category = categoriaDoc ? categoriaDoc.name : '';
          } else if (category && typeof category === 'string') {
            // Si es String normal, usar directamente
            category = category;
          } else {
            category = '';
          }
          
          const categoryLower = category.toString().toLowerCase();
          
          if (categoryLower === 'vacunas' || categoryLower === 'vacuna') {
            hasVaccines = true;
            vaccineProducts.push({ producto, quantity: item.quantity });
          } else if (categoryLower === 'desparasitantes' || categoryLower === 'desparasitante') {
            hasDewormers = true;
            dewormerProducts.push({ producto, quantity: item.quantity });
          }
        }
      }
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
    } else if (hasVaccines || hasDewormers) {
      // Si hay vacunas o desparasitantes pero no hay mascota, rechazar
      return res.status(400).json({
        success: false,
        message: 'Para vender vacunas o desparasitantes debe seleccionar una mascota'
      });
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
      saleChannel,
      customer,
      mascota,
      user,
      notes,
      commission,
      // Solo incluir valores financieros manuales si son proporcionados y es Mercado Libre
      ...(saleChannel === 'mercado_libre' && subtotal !== undefined && { subtotal }),
      ...(saleChannel === 'mercado_libre' && total !== undefined && { total }),
      ...(saleChannel === 'mercado_libre' && netIncome !== undefined && { netIncome })
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
      } else if (item.type === 'servicio') {
        // Descontar insumos del inventario para servicios
        const servicio = await Servicio.findById(item.item);
        if (servicio && servicio.insumos && servicio.insumos.length > 0) {
          for (const insumo of servicio.insumos) {
            const producto = await Producto.findById(insumo.producto);
            if (producto) {
              const cantidadUsada = insumo.cantidad * item.quantity;
              producto.stock -= cantidadUsada;
              if (producto.stock < 0) producto.stock = 0;
              await producto.save();
            }
          }
        }
      }
    }

    // 8. Registrar vacunas y desparasitantes en el carnet si aplica
    if ((hasVaccines || hasDewormers) && mascota) {
      try {
        const mascotaDoc = await Mascota.findById(mascota);
        const clienteDoc = await Cliente.findById(customer);
        
        // Buscar o crear carnet de vacunación
        let carnet = await CarnetVacunacion.findOne({ mascota });
        
        if (!carnet) {
          carnet = new CarnetVacunacion({
            mascota,
            nombreMascota: mascotaDoc.name,
            especie: mascotaDoc.type,
            raza: mascotaDoc.breed,
            propietario: customer,
            nombrePropietario: clienteDoc.name,
            vacunas: []
          });
        }
        
        // Agregar vacunas al carnet
        for (const { producto, quantity } of vaccineProducts) {
          for (let i = 0; i < quantity; i++) {
            const vacunaEntry = {
              vacuna: producto._id,
              nombre: producto.name,
              tipo: 'vacuna',
              fecha: getCurrentDateGMT7(),
              venta: venta._id
            };
            carnet.vacunas.push(vacunaEntry);
            
            // Crear recordatorio automático para próxima dosis (30 días después)
            try {
              const proximaDosis = new Date(getCurrentDateGMT7());
              proximaDosis.setDate(proximaDosis.getDate() + 30);
              
              await Recordatorio.create({
                title: `Próxima vacuna - ${producto.name}`,
                description: `Próxima dosis de ${producto.name} para ${mascotaDoc.name}`,
                date: proximaDosis,
                type: 'vacuna',
                priority: 'media',
                relatedId: mascota,
                relatedModel: 'Mascota',
                status: 'pendiente',
                user: user
              });
            } catch (reminderError) {
              console.error('Error al crear recordatorio automático de vacuna:', reminderError);
              // No fallar la venta si falla el recordatorio
            }
          }
        }
        
        // Agregar desparasitantes al carnet
        for (const { producto, quantity } of dewormerProducts) {
          for (let i = 0; i < quantity; i++) {
            const desparasitanteEntry = {
              vacuna: producto._id,
              nombre: producto.name,
              tipo: 'desparasitante',
              fecha: getCurrentDateGMT7(),
              venta: venta._id
            };
            carnet.vacunas.push(desparasitanteEntry);
            
            // NO crear recordatorio automático para desparasitantes
            // La próxima aplicación debe configurarse manualmente según el producto específico
          }
        }
        
        await carnet.save();
      } catch (error) {
        console.error('Error al registrar vacunas/desparasitantes en carnet:', error);
        // No fallar la venta si falla el registro del carnet, solo loggear el error
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
    const { status, notes, items, total, commission, discount, customer, mascota, amountReceived, change, paymentMethod, saleChannel } = req.body;
    
    const venta = await Venta.findById(req.params.id);
    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Campos sensibles que solo admin puede modificar
    const sensitiveFields = ['items', 'total', 'commission', 'discount', 'customer', 'mascota', 'amountReceived', 'change', 'paymentMethod', 'saleChannel'];
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
      if (items) {
        // Guardar items originales para ajustar inventario
        const originalItems = venta.items;
        
        // Devolver stock de items originales (solo productos)
        for (const originalItem of originalItems) {
          if (originalItem.type === 'producto') {
            const producto = await Producto.findById(originalItem.item);
            if (producto) {
              producto.stock += originalItem.quantity;
              await producto.save();
            }
          }
        }
        
        // Verificar stock disponible para nuevos items
        for (const newItem of items) {
          if (newItem.type === 'producto') {
            const producto = await Producto.findById(newItem.item);
            if (!producto) {
              // Si no existe producto, revertir stock y rechazar
              for (const originalItem of originalItems) {
                if (originalItem.type === 'producto') {
                  const prod = await Producto.findById(originalItem.item);
                  if (prod) {
                    prod.stock -= originalItem.quantity;
                    await prod.save();
                  }
                }
              }
              return res.status(404).json({
                success: false,
                message: `Producto con ID ${newItem.item} no encontrado`
              });
            }
            
            if (producto.stock < newItem.quantity) {
              // Si no hay suficiente stock, revertir stock y rechazar
              for (const originalItem of originalItems) {
                if (originalItem.type === 'producto') {
                  const prod = await Producto.findById(originalItem.item);
                  if (prod) {
                    prod.stock -= originalItem.quantity;
                    await prod.save();
                  }
                }
              }
              return res.status(400).json({
                success: false,
                message: `Stock insuficiente para ${producto.name}. Stock disponible: ${producto.stock}`
              });
            }
          }
        }
        
        // Descontar stock de nuevos items
        for (const newItem of items) {
          if (newItem.type === 'producto') {
            const producto = await Producto.findById(newItem.item);
            if (producto) {
              producto.stock -= newItem.quantity;
              await producto.save();
            }
          }
        }
        
        venta.items = items;
      }
      if (paymentMethod !== undefined) venta.paymentMethod = paymentMethod;
      if (saleChannel !== undefined) venta.saleChannel = saleChannel;
      if (customer !== undefined) venta.customer = customer;
      if (mascota !== undefined) venta.mascota = mascota;
      if (amountReceived !== undefined) venta.amountReceived = amountReceived;
      if (change !== undefined) venta.change = change;
      
      // Si se modifican items o paymentMethod, recalcular totales en backend
      if (items || paymentMethod !== undefined) {
        // Calcular subtotal de cada item
        venta.items.forEach(item => {
          item.subtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
        });
        
        // Calcular subtotal total
        venta.subtotal = Math.round(venta.items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
        
        // Calcular comisión de tarjeta (4.6%) solo si paymentMethod es tarjeta
        if (venta.paymentMethod === 'tarjeta') {
          venta.cardCommission = Math.round((venta.subtotal * 0.046) * 100) / 100;
        } else {
          venta.cardCommission = 0;
        }
        
        // Calcular total (subtotal + comisión de tarjeta)
        venta.total = Math.round((venta.subtotal + venta.cardCommission) * 100) / 100;
        
        // Calcular ingreso neto (total - commission - cardCommission)
        venta.netIncome = Math.round((venta.total - (venta.commission || 0) - venta.cardCommission) * 100) / 100;
      }
      
      // Si se envían manualmente, usar esos valores (solo admin puede hacerlo)
      if (total !== undefined) venta.total = total;
      if (commission !== undefined) venta.commission = commission;
      if (discount !== undefined) venta.discount = discount;
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
// @desc    Cancelar venta y devolver stock (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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

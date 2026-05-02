const express = require('express');
const Recordatorio = require('../models/Recordatorio');
const router = express.Router();

// @route   GET /api/recordatorios
// @desc    Obtener todos los recordatorios
router.get('/', async (req, res) => {
  try {
    const { type, status, priority, date, page = 1, limit = 10 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const recordatorios = await Recordatorio.find(query)
      .populate('user', 'name')
      .sort({ date: 1, priority: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Recordatorio.countDocuments(query);

    res.json({
      success: true,
      data: recordatorios,
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
      message: 'Error al obtener recordatorios'
    });
  }
});

// @route   GET /api/recordatorios/upcoming
// @desc    Obtener recordatorios próximos (próximos 7 días)
router.get('/upcoming', async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);
    
    const recordatorios = await Recordatorio.find({
      status: 'pendiente',
      date: { $gte: today, $lte: next7Days }
    })
      .populate('user', 'name')
      .sort({ date: 1, priority: -1 });

    res.json({
      success: true,
      data: recordatorios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorios próximos'
    });
  }
});

// @route   GET /api/recordatorios/overdue
// @desc    Obtener recordatorios vencidos
router.get('/overdue', async (req, res) => {
  try {
    const today = new Date();
    
    const recordatorios = await Recordatorio.find({
      status: 'pendiente',
      date: { $lt: today }
    })
      .populate('user', 'name')
      .sort({ date: 1, priority: -1 });

    res.json({
      success: true,
      data: recordatorios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorios vencidos'
    });
  }
});

// @route   GET /api/recordatorios/:id
// @desc    Obtener recordatorio por ID
router.get('/:id', async (req, res) => {
  try {
    const recordatorio = await Recordatorio.findById(req.params.id)
      .populate('user', 'name');
    
    if (!recordatorio) {
      return res.status(404).json({
        success: false,
        message: 'Recordatorio no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: recordatorio
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorio'
    });
  }
});

// @route   POST /api/recordatorios
// @desc    Crear nuevo recordatorio
router.post('/', async (req, res) => {
  try {
    const recordatorio = await Recordatorio.create(req.body);
    await recordatorio.populate('user', 'name');
    
    res.status(201).json({
      success: true,
      data: recordatorio
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
      message: 'Error al crear recordatorio'
    });
  }
});

// @route   PUT /api/recordatorios/:id
// @desc    Actualizar recordatorio
router.put('/:id', async (req, res) => {
  try {
    const recordatorio = await Recordatorio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name');
    
    if (!recordatorio) {
      return res.status(404).json({
        success: false,
        message: 'Recordatorio no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: recordatorio
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
      message: 'Error al actualizar recordatorio'
    });
  }
});

// @route   DELETE /api/recordatorios/:id
// @desc    Eliminar recordatorio
router.delete('/:id', async (req, res) => {
  try {
    const recordatorio = await Recordatorio.findByIdAndDelete(req.params.id);
    
    if (!recordatorio) {
      return res.status(404).json({
        success: false,
        message: 'Recordatorio no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Recordatorio eliminado correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar recordatorio'
    });
  }
});

// @route   PATCH /api/recordatorios/:id/complete
// @desc    Marcar recordatorio como completado
router.patch('/:id/complete', async (req, res) => {
  try {
    const recordatorio = await Recordatorio.findById(req.params.id);
    
    if (!recordatorio) {
      return res.status(404).json({
        success: false,
        message: 'Recordatorio no encontrado'
      });
    }

    if (recordatorio.status === 'completado') {
      return res.status(400).json({
        success: false,
        message: 'El recordatorio ya está completado'
      });
    }

    await recordatorio.complete();
    await recordatorio.populate('user', 'name');

    res.json({
      success: true,
      data: recordatorio,
      message: 'Recordatorio marcado como completado'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al completar recordatorio'
    });
  }
});

// @route   GET /api/recordatorios/calendar/:year/:month
// @desc    Obtener recordatorios para vista de calendario
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    const recordatorios = await Recordatorio.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'pendiente'
    })
      .populate('user', 'name')
      .sort({ date: 1, priority: -1 });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        recordatorios
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recordatorios del calendario'
    });
  }
});

module.exports = router;

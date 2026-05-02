const express = require('express');
const Costo = require('../models/Costo');
const router = express.Router();

// @route   GET /api/costos
// @desc    Obtener todos los costos
router.get('/', async (req, res) => {
  try {
    const { type, category, frequency, active, page = 1, limit = 10 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (frequency) query.frequency = frequency;
    if (active !== undefined) query.isActive = active === 'true';

    const costos = await Costo.find(query)
      .populate('user', 'name')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Costo.countDocuments(query);

    res.json({
      success: true,
      data: costos,
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
      message: 'Error al obtener costos'
    });
  }
});

// @route   GET /api/costos/:id
// @desc    Obtener costo por ID
router.get('/:id', async (req, res) => {
  try {
    const costo = await Costo.findById(req.params.id)
      .populate('user', 'name');
    
    if (!costo) {
      return res.status(404).json({
        success: false,
        message: 'Costo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: costo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener costo'
    });
  }
});

// @route   POST /api/costos
// @desc    Crear nuevo costo
router.post('/', async (req, res) => {
  try {
    const costo = await Costo.create(req.body);
    await costo.populate('user', 'name');
    
    res.status(201).json({
      success: true,
      data: costo
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
      message: 'Error al crear costo'
    });
  }
});

// @route   PUT /api/costos/:id
// @desc    Actualizar costo
router.put('/:id', async (req, res) => {
  try {
    const costo = await Costo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name');
    
    if (!costo) {
      return res.status(404).json({
        success: false,
        message: 'Costo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: costo
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
      message: 'Error al actualizar costo'
    });
  }
});

// @route   DELETE /api/costos/:id
// @desc    Eliminar costo (desactivar)
router.delete('/:id', async (req, res) => {
  try {
    const costo = await Costo.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!costo) {
      return res.status(404).json({
        success: false,
        message: 'Costo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Costo desactivado correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar costo'
    });
  }
});

// @route   GET /api/costos/summary/:period
// @desc    Obtener resumen de costos por período
router.get('/summary/:period', async (req, res) => {
  try {
    const { period } = req.params; // 'month' | 'year'
    const { year, month } = req.query;
    
    let startDate, endDate, groupFormat;
    
    if (period === 'month') {
      const targetYear = parseInt(year) || new Date().getFullYear();
      const targetMonth = parseInt(month) || new Date().getMonth() + 1;
      
      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      groupFormat = { $dayOfMonth: '$date' };
    } else if (period === 'year') {
      const targetYear = parseInt(year) || new Date().getFullYear();
      
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      groupFormat = { $month: '$date' };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Período no válido. Use "month" o "year"'
      });
    }

    const summary = await Costo.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            period: groupFormat,
            type: '$type',
            category: '$category'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            period: '$_id.period',
            type: '$_id.type'
          },
          categories: {
            $push: {
              category: '$_id.category',
              total: '$total',
              count: '$count'
            }
          },
          total: { $sum: '$total' }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          types: {
            $push: {
              type: '$_id.type',
              categories: '$categories',
              total: '$total'
            }
          },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const totalByType = await Costo.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalByCategory = await Costo.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        summary,
        totalByType,
        totalByCategory,
        grandTotal: totalByType.reduce((sum, item) => sum + item.total, 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de costos'
    });
  }
});

module.exports = router;

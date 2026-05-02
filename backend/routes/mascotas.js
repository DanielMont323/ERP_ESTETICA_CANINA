const express = require('express');
const Mascota = require('../models/Mascota');
const Cliente = require('../models/Cliente');
const router = express.Router();

// @route   GET /api/mascotas
// @desc    Obtener todas las mascotas
router.get('/', async (req, res) => {
  try {
    const { owner, type, active, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (owner) query.owner = owner;
    if (type) query.type = type;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } }
      ];
    }

    const mascotas = await Mascota.find(query)
      .populate('owner', 'name phone email')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Mascota.countDocuments(query);

    res.json({
      success: true,
      data: mascotas,
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
      message: 'Error al obtener mascotas'
    });
  }
});

// @route   GET /api/mascotas/:id
// @desc    Obtener mascota por ID
router.get('/:id', async (req, res) => {
  try {
    const mascota = await Mascota.findById(req.params.id)
      .populate('owner', 'name phone email address');
    
    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: mascota
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mascota'
    });
  }
});

// @route   POST /api/mascotas
// @desc    Crear nueva mascota
router.post('/', async (req, res) => {
  try {
    // Verificar que el cliente exista solo si se proporciona owner
    if (req.body.owner) {
      const cliente = await Cliente.findById(req.body.owner);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }
    }

    const mascota = await Mascota.create(req.body);
    if (req.body.owner) {
      await mascota.populate('owner', 'name phone email');
    }
    
    res.status(201).json({
      success: true,
      data: mascota
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
      message: 'Error al crear mascota'
    });
  }
});

// @route   PUT /api/mascotas/:id
// @desc    Actualizar mascota
router.put('/:id', async (req, res) => {
  try {
    // Si se cambia el owner, verificar que exista
    if (req.body.owner) {
      const cliente = await Cliente.findById(req.body.owner);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }
    }

    const mascota = await Mascota.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'name phone email');
    
    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: mascota
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
      message: 'Error al actualizar mascota'
    });
  }
});

// @route   DELETE /api/mascotas/:id
// @desc    Eliminar mascota permanentemente
router.delete('/:id', async (req, res) => {
  try {
    const mascota = await Mascota.findByIdAndDelete(req.params.id);
    
    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Mascota eliminada permanentemente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar mascota'
    });
  }
});

// @route   POST /api/mascotas/:id/medical-history
// @desc    Agregar registro al historial médico
router.post('/:id/medical-history', async (req, res) => {
  try {
    const { description, veterinarian, cost } = req.body;
    
    const mascota = await Mascota.findById(req.params.id);
    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    mascota.medicalHistory.push({
      description,
      veterinarian,
      cost,
      date: new Date()
    });

    await mascota.save();
    await mascota.populate('owner', 'name phone email');

    res.json({
      success: true,
      data: mascota
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar registro médico'
    });
  }
});

// @route   POST /api/mascotas/:id/vaccinations
// @desc    Agregar vacuna
router.post('/:id/vaccinations', async (req, res) => {
  try {
    const { name, date, nextDueDate, veterinarian } = req.body;
    
    const mascota = await Mascota.findById(req.params.id);
    if (!mascota) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    mascota.vaccinations.push({
      name,
      date: new Date(date),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      veterinarian
    });

    await mascota.save();
    await mascota.populate('owner', 'name phone email');

    res.json({
      success: true,
      data: mascota
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar vacuna'
    });
  }
});

// @route   GET /api/mascotas/vaccinations/due
// @desc    Obtener mascotas con vacunas próximas a vencer
router.get('/vaccinations/due', async (req, res) => {
  try {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const mascotas = await Mascota.find({
      'vaccinations.nextDueDate': {
        $gte: today,
        $lte: next30Days
      },
      isActive: true
    }).populate('owner', 'name phone email');

    res.json({
      success: true,
      data: mascotas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacunas próximas'
    });
  }
});

module.exports = router;

const express = require('express');
const CategoriaProducto = require('../models/CategoriaProducto');
const router = express.Router();

// @route   GET /api/categorias-producto
// @desc    Obtener todas las categorías de productos
router.get('/', async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = {};
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categorias = await CategoriaProducto.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías de productos'
    });
  }
});

// @route   GET /api/categorias-producto/:id
// @desc    Obtener categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const categoria = await CategoriaProducto.findById(req.params.id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: categoria
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría'
    });
  }
});

// @route   POST /api/categorias-producto
// @desc    Crear nueva categoría de producto
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Verificar si ya existe una categoría con ese nombre
    const existingCategoria = await CategoriaProducto.findOne({ name });
    if (existingCategoria) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    const categoria = await CategoriaProducto.create({
      name,
      description
    });

    res.status(201).json({
      success: true,
      data: categoria,
      message: 'Categoría creada correctamente'
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
      message: 'Error al crear categoría'
    });
  }
});

// @route   PUT /api/categorias-producto/:id
// @desc    Actualizar categoría de producto
router.put('/:id', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const categoria = await CategoriaProducto.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si el nuevo nombre ya existe en otra categoría
    if (name && name !== categoria.name) {
      const existingCategoria = await CategoriaProducto.findOne({ name });
      if (existingCategoria) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }
    }

    if (name !== undefined) categoria.name = name;
    if (description !== undefined) categoria.description = description;
    if (isActive !== undefined) categoria.isActive = isActive;

    await categoria.save();

    res.json({
      success: true,
      data: categoria,
      message: 'Categoría actualizada correctamente'
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
      message: 'Error al actualizar categoría'
    });
  }
});

// @route   DELETE /api/categorias-producto/:id
// @desc    Eliminar categoría de producto
router.delete('/:id', async (req, res) => {
  try {
    const categoria = await CategoriaProducto.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    await CategoriaProducto.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Categoría eliminada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría'
    });
  }
});

module.exports = router;

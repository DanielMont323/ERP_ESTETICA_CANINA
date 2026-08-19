const express = require('express');
const Producto = require('../models/Producto');
const CategoriaProducto = require('../models/CategoriaProducto');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Función para verificar si un string es un ObjectId válido
const isObjectId = (str) => {
  return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
};

// Función para obtener el nombre de la categoría
const getCategoryName = async (category) => {
  if (!category) return '';
  
  if (category && typeof category === 'object') {
    const categoriaDoc = await CategoriaProducto.findById(category);
    return categoriaDoc ? categoriaDoc.name : '';
  } else if (category && isObjectId(category)) {
    const categoriaDoc = await CategoriaProducto.findById(category);
    return categoriaDoc ? categoriaDoc.name : '';
  } else if (category && typeof category === 'string') {
    return category;
  }
  return '';
};

// Función para verificar si una categoría es vacuna o desparasitante
const isVaccineOrDewormer = (categoryName) => {
  const categoryLower = categoryName.toString().toLowerCase();
  return categoryLower === 'vacunas' || categoryLower === 'vacuna' ||
         categoryLower === 'desparasitantes' || categoryLower === 'desparasitante' ||
         categoryLower.includes('desparasitante');
};

// Función para determinar el tipo (vacuna o desparasitante)
const getType = (categoryName) => {
  const categoryLower = categoryName.toString().toLowerCase();
  if (categoryLower === 'vacunas' || categoryLower === 'vacuna') {
    return 'vacuna';
  }
  return 'desparasitante';
};

// @route   GET /api/vacunas
// @desc    Obtener todos los productos de vacunas y desparasitantes (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { active, type } = req.query;
    let query = { isDeleted: false };
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    console.log('=== AUDITORÍA CATÁLOGO VACUNAS ===');
    console.log('Query:', query);
    
    // Obtener todos los productos sin populate (category es Mixed)
    const productos = await Producto.find(query).sort({ name: 1 });
    
    console.log('Total productos encontrados:', productos.length);
    
    // Obtener todas las categorías que son ObjectId para hacer lookup eficiente
    const categoryIds = [];
    const categoryMap = new Map();
    
    for (const producto of productos) {
      if (producto.category && typeof producto.category === 'object') {
        categoryIds.push(producto.category);
      } else if (producto.category && isObjectId(producto.category)) {
        categoryIds.push(producto.category);
      }
    }
    
    // Obtener categorías en una sola consulta
    if (categoryIds.length > 0) {
      const categorias = await CategoriaProducto.find({ _id: { $in: categoryIds } });
      categorias.forEach(cat => {
        categoryMap.set(cat._id.toString(), cat.name);
      });
    }
    
    // Filtrar productos que sean vacunas o desparasitantes
    const filteredProducts = [];
    
    for (const producto of productos) {
      // Obtener nombre de categoría
      let categoryName = '';
      if (producto.category && typeof producto.category === 'object') {
        categoryName = categoryMap.get(producto.category._id.toString()) || '';
      } else if (producto.category && isObjectId(producto.category)) {
        categoryName = categoryMap.get(producto.category.toString()) || '';
      } else if (producto.category && typeof producto.category === 'string') {
        categoryName = producto.category;
      }
      
      console.log(`Producto: ${producto.name}, Category: ${JSON.stringify(producto.category)}, CategoryName: ${categoryName}`);
      
      if (isVaccineOrDewormer(categoryName)) {
        const productType = getType(categoryName);
        
        // Filtrar por tipo si se especifica
        if (type && type !== productType) {
          continue;
        }
        
        filteredProducts.push({
          ...producto.toObject(),
          type: productType,
          categoryName: categoryName
        });
      }
    }

    console.log('Productos filtrados (vacunas/desparasitantes):', filteredProducts.length);
    console.log('Productos filtrados:', filteredProducts.map(p => p.name));

    res.json({
      success: true,
      data: filteredProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacunas y desparasitantes'
    });
  }
});

// @route   GET /api/vacunas/active
// @desc    Obtener vacunas y desparasitantes activos (para selector en carnet)
router.get('/active', async (req, res) => {
  try {
    // Populate category para evitar N+1 consultas
    const productos = await Producto.find({ isActive: true, isDeleted: false })
      .populate('category', 'name')
      .sort({ name: 1 });
    
    // Filtrar productos que sean vacunas o desparasitantes
    const filteredProducts = [];
    
    for (const producto of productos) {
      // Obtener nombre de categoría (ya está populado)
      let categoryName = '';
      if (producto.category && producto.category.name) {
        categoryName = producto.category.name;
      } else if (producto.category && typeof producto.category === 'string') {
        categoryName = producto.category;
      }
      
      if (isVaccineOrDewormer(categoryName)) {
        filteredProducts.push({
          _id: producto._id,
          name: producto.name,
          type: getType(categoryName)
        });
      }
    }

    res.json({
      success: true,
      data: filteredProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacunas y desparasitantes activos'
    });
  }
});

// @route   GET /api/vacunas/:id
// @desc    Obtener vacuna por ID (solo admin)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.findById(req.params.id);
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vacuna'
    });
  }
});

// @route   POST /api/vacunas
// @desc    Crear nueva vacuna (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.create(req.body);
    
    res.status(201).json({
      success: true,
      data: vacuna,
      message: 'Vacuna creada correctamente'
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una vacuna con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear vacuna'
    });
  }
});

// @route   PUT /api/vacunas/:id
// @desc    Actualizar vacuna (solo admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vacuna = await Vacuna.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna,
      message: 'Vacuna actualizada correctamente'
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una vacuna con ese nombre'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar vacuna'
    });
  }
});

// @route   PATCH /api/vacunas/:id/status
// @desc    Activar/desactivar vacuna (solo admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const vacuna = await Vacuna.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    
    if (!vacuna) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: vacuna,
      message: isActive ? 'Vacuna activada correctamente' : 'Vacuna desactivada correctamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de vacuna'
    });
  }
});

module.exports = router;

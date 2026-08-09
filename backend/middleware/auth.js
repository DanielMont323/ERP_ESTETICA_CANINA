const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Middleware para autenticar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token, autorización denegada'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Usuario.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido - usuario no encontrado'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado - se requiere rol de administrador'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};

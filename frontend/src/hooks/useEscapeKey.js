import { useEffect } from 'react';

/**
 * Hook reutilizable para manejar la tecla ESC en modales/formularios
 * Cierra el modal/formulario cuando se presiona ESC
 */
export const useEscapeKey = (onClose, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, enabled]);
};

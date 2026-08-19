import { useEffect } from 'react';

/**
 * Hook reutilizable para navegación entre campos de formulario usando teclas físicas
 * ShiftLeft → siguiente campo
 * ControlLeft → campo anterior
 */
export const useKeyboardFormNavigation = (formRef, enabled = true) => {
  useEffect(() => {
    if (!enabled || !formRef) return;

    const handleKeyDown = (e) => {
      // Solo procesar si estamos dentro del formulario
      const formElement = formRef.current;
      if (!formElement || !formElement.contains(e.target)) return;

      // Detectar teclas físicas específicas (izquierda)
      const isShiftLeft = e.code === 'ShiftLeft';
      const isControlLeft = e.code === 'ControlLeft';

      // Si no es ShiftLeft ni ControlLeft, no hacer nada
      if (!isShiftLeft && !isControlLeft) return;

      // Verificar que no se esté usando como modificador con otra tecla
      // Si se presiona ShiftLeft + otra tecla, no navegar
      if (isShiftLeft && e.key !== 'Shift') return;
      // Si se presiona ControlLeft + otra tecla, no navegar
      if (isControlLeft && e.key !== 'Control') return;

      // Encontrar todos los campos editables en el formulario
      const editableFields = formElement.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), ' +
        'select:not([disabled]):not([tabindex="-1"]), ' +
        'textarea:not([disabled]):not([tabindex="-1"])'
      );

      // Filtrar elementos visibles
      const visibleFields = Array.from(editableFields).filter(field => {
        const rect = field.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (visibleFields.length === 0) return;

      // Encontrar el índice del campo actual
      const currentIndex = visibleFields.indexOf(e.target);
      if (currentIndex === -1) return;

      let nextIndex;

      if (isShiftLeft) {
        // Navegar al siguiente campo
        nextIndex = currentIndex + 1;
        if (nextIndex >= visibleFields.length) {
          nextIndex = 0; // Ciclar al inicio
        }
      } else if (isControlLeft) {
        // Navegar al campo anterior
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = visibleFields.length - 1; // Ciclar al final
        }
      }

      const nextField = visibleFields[nextIndex];
      if (nextField) {
        e.preventDefault();
        nextField.focus();
        
        // Opcionalmente seleccionar contenido si es un input de texto
        // pero no para campos específicos como SKU, cantidad, precio
        const shouldSelect = 
          nextField.type === 'text' && 
          nextField.value.length > 0 &&
          !nextField.name?.toLowerCase().includes('sku') &&
          !nextField.name?.toLowerCase().includes('cantidad') &&
          !nextField.name?.toLowerCase().includes('price') &&
          !nextField.name?.toLowerCase().includes('precio');
        
        if (shouldSelect) {
          nextField.select();
        }
      }
    };

    // Usar keydown para capturar las teclas
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formRef, enabled]);
};

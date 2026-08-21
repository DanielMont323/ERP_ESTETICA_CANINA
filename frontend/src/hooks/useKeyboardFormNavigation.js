import { useEffect } from 'react';

/**
 * Hook reutilizable para navegación entre campos de formulario usando teclas físicas
 * Numpad + → siguiente campo
 * Numpad - → campo anterior
 */
export const useKeyboardFormNavigation = (formRef, enabled = true) => {
  useEffect(() => {
    if (!enabled || !formRef) return;

    const handleKeyDown = (e) => {
      // Solo procesar si estamos dentro del formulario
      const formElement = formRef.current;
      if (!formElement || !formElement.contains(e.target)) return;

      // Detectar específicamente Numpad + y Numpad - usando e.code
      // e.code distingue entre teclas físicas del teclado numérico vs fila superior
      const isNumpadAdd = e.code === 'NumpadAdd';      // + del teclado numérico
      const isNumpadSubtract = e.code === 'NumpadSubtract'; // - del teclado numérico

      // Si no es Numpad + ni Numpad -, no hacer nada
      if (!isNumpadAdd && !isNumpadSubtract) return;

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

      if (isNumpadAdd) {
        // Navegar al siguiente campo
        nextIndex = currentIndex + 1;
        if (nextIndex >= visibleFields.length) {
          nextIndex = visibleFields.length - 1; // Permanecer en el último campo
        }
      } else if (isNumpadSubtract) {
        // Navegar al campo anterior
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = 0; // Permanecer en el primer campo
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

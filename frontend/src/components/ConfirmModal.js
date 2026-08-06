import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirmar acción',
  message = '¿Estás seguro de que deseas realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  icon: Icon = AlertTriangle
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      iconBg: 'bg-danger-100',
      iconColor: 'text-danger-600',
      confirmBtn: 'btn-danger'
    },
    warning: {
      iconBg: 'bg-warning-100',
      iconColor: 'text-warning-600',
      confirmBtn: 'btn-warning'
    },
    info: {
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
      confirmBtn: 'btn-primary'
    }
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="modal-overlay"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative modal-content max-w-md w-full p-6 animate-slide-up">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${style.iconBg} mb-4`}>
            <Icon className={`h-6 w-6 ${style.iconColor}`} />
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-md"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`btn btn-md ${style.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  type?: 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  hideIcon?: boolean;
  imageOnly?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  isConfirmDisabled = false,
  hideIcon = false,
  imageOnly = false
}) => {
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [isVisible, setIsVisible] = React.useState(false);

  if (isOpen && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para que React aplique el DOM antes de la clase de animación
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      const visibilityTimer = setTimeout(() => setIsVisible(false), 0);
      const renderTimer = setTimeout(() => setIsRendered(false), 200);
      return () => {
        clearTimeout(visibilityTimer);
        clearTimeout(renderTimer);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const icons = {
    danger: <AlertTriangle className="text-rose-500" size={24} />,
    success: <CheckCircle2 className="text-emerald-500" size={24} />,
    info: <Info className="text-yellow-500" size={24} />
  };

  const confirmVariants = {
    danger: 'primary', // We use primary (red) for danger actions
    success: 'primary',
    info: 'primary'
  } as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative ${imageOnly ? 'w-auto max-w-[95vw] bg-transparent p-0' : 'w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6'} transition-all duration-200 transform ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 transition-colors z-[110] ${
            imageOnly 
              ? 'text-white hover:text-white bg-black/40 hover:bg-black/60 rounded-full' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl'
          }`}
        >
          <X size={20} />
        </button>

        {!imageOnly && (
          <div className="flex items-start gap-4 mb-6">
            {!hideIcon && (
              <div className={`p-3 shrink-0 rounded-xl ${
                type === 'danger' ? 'bg-rose-50 dark:bg-rose-500/10' : 
                type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 
                'bg-yellow-50 dark:bg-yellow-500/10'
              }`}>
                {icons[type]}
              </div>
            )}
            <div className="flex-1 mt-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              {description && (
                <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {children && <div className={imageOnly ? '' : 'mb-6'}>{children}</div>}

        {!imageOnly && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 order-2 sm:order-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            {onConfirm && (
              <Button 
                variant={confirmVariants[type]} 
                onClick={onConfirm} 
                className="flex-1 order-1 sm:order-2"
                isLoading={isLoading}
                disabled={isConfirmDisabled}
              >
                {confirmText}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

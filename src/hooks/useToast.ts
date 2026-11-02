import { useState, useCallback, useRef, useEffect } from 'react';

// Duración según el largo del texto: los mensajes del backend pueden ser
// largos ("El transportista no pertenece a ninguno de los grupos habilitados
// para este viaje") y 3s no alcanzan para leerlos. Los errores duran más.
const getToastDuration = (message: string, type: 'success' | 'error') => {
  const base = type === 'error' ? 5000 : 3000;
  return Math.min(10000, base + message.length * 40);
};

export const useToast = () => {
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    // Sin esto, el timer de un toast anterior cerraba antes de tiempo el nuevo.
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ isVisible: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, getToastDuration(message, type));
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, showToast, hideToast };
};

import { useState, useCallback } from 'react';

interface ConfirmState<T> {
  isOpen: boolean;
  data: T | null;
}

export function useConfirm<T = unknown>() {
  const [state, setState] = useState<ConfirmState<T>>({
    isOpen: false,
    data: null
  });

  const ask = useCallback((data: T) => {
    setState({ isOpen: true, data });
  }, []);

  const confirm = useCallback(() => {
    setState({ isOpen: false, data: null });
  }, []);

  const cancel = useCallback(() => {
    setState({ isOpen: false, data: null });
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    ask,
    confirm,
    cancel
  };
}

import React from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 sm:top-8 left-4 right-4 sm:left-auto sm:right-8 z-[9999] bg-zinc-900 dark:bg-zinc-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-8 duration-300 sm:min-w-[350px] border border-zinc-700/50 ring-1 ring-black/5">
      <div className={`p-2 rounded-xl ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
        {type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
      </div>
      <div className="flex-1">
        <p className="font-bold text-base leading-tight">{message}</p>
      </div>
      <button 
        onClick={onClose}
        className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors text-slate-400"
      >
        <X size={20} />
      </button>
    </div>
  );
};

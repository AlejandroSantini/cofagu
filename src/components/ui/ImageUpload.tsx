import React, { useState } from 'react';
import { UploadCloud, Check, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from './Toast';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (base64: string) => void;
  error?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, error }) => {
  const [selectedFileName, setSelectedFileName] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'error');
      return;
    }

    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.onerror = () => {
      showToast('Error al leer el archivo', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFileName('');
    onChange('');
  };

  return (
    <div className="flex flex-col w-full gap-2">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="flex gap-4">
        <div className="flex-1 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-xl p-3 text-center relative hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-all">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud className="mx-auto text-slate-400 mb-1" size={24} />
          <p className="text-[10px] font-bold text-slate-500">
            {selectedFileName ? selectedFileName : (value ? "Cambiar imagen" : "Seleccionar imagen")}
          </p>
        </div>
      </div>
      
      {value && (
        <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
          <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-500/20" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate flex-1">
            {selectedFileName || 'Imagen cargada'}
          </span>
          <div className="flex items-center gap-2">
            <Check className="text-emerald-500" size={16} />
            <button 
              onClick={handleClear}
              className="text-rose-500 hover:text-rose-600 focus:outline-none p-1 rounded hover:bg-rose-500/10 transition-all"
              title="Eliminar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <span className="text-xs font-medium text-rose-500 ml-1">{error}</span>
      )}
    </div>
  );
};

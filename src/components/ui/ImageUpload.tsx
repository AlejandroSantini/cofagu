import React, { useState, useEffect } from 'react';
import { UploadCloud, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from './Toast';
import { uploadService } from '../../api/services';
import { api } from '../../api/axios';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  error?: string;
}

export const SecureImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!src || typeof src !== 'string' || src.startsWith('data:') || src.startsWith('blob:')) {
      return;
    }

    let active = true;
    let currentBlobUrl = '';
    const fetchSecureImage = async () => {
      // If the URL is an external URL (e.g. Cloudflare R2), don't try to fetch it securely, just use it directly
      if (!src.startsWith('/api') && (!import.meta.env.VITE_API_URL || !src.startsWith(import.meta.env.VITE_API_URL))) {
        setBlobUrl(src);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(src, { responseType: 'blob' });
        if (active && response.data) {
          currentBlobUrl = URL.createObjectURL(response.data);
          setBlobUrl(currentBlobUrl);
        }
      } catch (error) {
        console.error('Error fetching secure image preview:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSecureImage();

    return () => {
      active = false;
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(currentBlobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [src]);

  const displayUrl = (src && typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'))) ? src : blobUrl;

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-zinc-800 ${className}`}>
        <Loader2 className="animate-spin text-slate-400" size={16} />
      </div>
    );
  }

  if (!displayUrl) {
    return (
      <div className={`flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 ${className}`}>
        <X size={16} />
      </div>
    );
  }

  return <img src={displayUrl} alt={alt} className={className} />;
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, error }) => {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes (JPG, PNG, etc.)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('El archivo no debe superar los 5MB', 'error');
      return;
    }

    setSelectedFileName(file.name);
    setIsUploading(true);
    
    try {
      const res = await uploadService.uploadFile(file);
      if (res.data.success) {
        onChange(res.data.data.fileUrl);
        showToast('Imagen subida correctamente', 'success');
      } else {
        showToast('Error al subir la imagen', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al subir la imagen', 'error');
    } finally {
      setIsUploading(false);
    }
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
        <div className={`
          flex-1 border-2 border-dashed rounded-xl p-4 text-center relative transition-all duration-300
          ${error 
            ? 'border-rose-300 bg-rose-500/5 dark:border-rose-900/50' 
            : 'border-slate-200 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-zinc-800/30'
          }
        `}>
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2">
              <Loader2 className="animate-spin text-emerald-500 mb-1" size={24} />
              <p className="text-[10px] font-bold text-slate-500">Subiendo...</p>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <UploadCloud className="mx-auto text-slate-400 mb-1" size={24} />
              <p className="text-[10px] font-bold text-slate-500">
                {selectedFileName ? selectedFileName : (value ? "Cambiar imagen" : "Seleccionar imagen")}
              </p>
            </>
          )}
        </div>
      </div>
      
      {value && !isUploading && (
        <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
          <SecureImage src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-500/20" />
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


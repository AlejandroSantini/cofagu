import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadService } from '../../api/services';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const ApplicationRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    const fetchAndRedirect = async () => {
      try {
        const res = await loadService.getApplication(Number(id));
        if (active && res.data.success && res.data.data) {
          navigate(`/loads/${res.data.data.loadId}`, { replace: true });
        } else if (active) {
          showToast('Postulación no encontrada', 'error');
          navigate('/loads', { replace: true });
        }
      } catch (err) {
        if (active) {
          showToast('Error al buscar la postulación', 'error');
          navigate('/loads', { replace: true });
        }
      }
    };
    if (id) fetchAndRedirect();
    return () => { active = false; };
  }, [id, navigate, showToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="animate-spin text-emerald-600" size={48} />
      <p className="text-slate-500 font-medium">Redirigiendo al detalle del viaje...</p>
    </div>
  );
};

export const ContingencyRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    const fetchAndRedirect = async () => {
      try {
        const res = await loadService.getContingency(Number(id));
        if (active && res.data.success && res.data.data) {
          navigate(`/loads/${res.data.data.loadId}`, { replace: true });
        } else if (active) {
          showToast('Contingencia no encontrada', 'error');
          navigate('/loads', { replace: true });
        }
      } catch (err) {
        if (active) {
          showToast('Error al buscar la contingencia', 'error');
          navigate('/loads', { replace: true });
        }
      }
    };
    if (id) fetchAndRedirect();
    return () => { active = false; };
  }, [id, navigate, showToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="animate-spin text-emerald-600" size={48} />
      <p className="text-slate-500 font-medium">Redirigiendo a la contingencia...</p>
    </div>
  );
};

export const NoShowRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    const fetchAndRedirect = async () => {
      try {
        const res = await loadService.getNoShow(Number(id));
        if (active && res.data.success && res.data.data) {
          navigate(`/loads/${res.data.data.loadId}`, { replace: true });
        } else if (active) {
          showToast('Inasistencia no encontrada', 'error');
          navigate('/loads', { replace: true });
        }
      } catch (err) {
        if (active) {
          showToast('Error al buscar la inasistencia', 'error');
          navigate('/loads', { replace: true });
        }
      }
    };
    if (id) fetchAndRedirect();
    return () => { active = false; };
  }, [id, navigate, showToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="animate-spin text-emerald-600" size={48} />
      <p className="text-slate-500 font-medium">Redirigiendo al detalle de la inasistencia...</p>
    </div>
  );
};

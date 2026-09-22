import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { isMobileDevice } from '../utils/device';

const DISMISSED_KEY = 'cofagu_push_onboarding_dismissed';

interface PushOnboardingModalProps {
  isAuthenticated: boolean;
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  loading: boolean;
  requiresStandaloneMode: boolean;
  notSupported: boolean;
}

/**
 * Modal de onboarding para activar push, pensado para mobile: aparece una
 * sola vez (se recuerda en localStorage) cuando el permiso todavía no se
 * pidió. En iPhone/Safari sin estar instalada como acceso directo, el
 * permiso no se puede pedir desde la pestaña — ahí solo se muestran los
 * pasos para instalarla, sin botón de activar.
 */
export const PushOnboardingModal: React.FC<PushOnboardingModalProps> = ({
  isAuthenticated,
  permissionStatus,
  requestPermission,
  loading,
  requiresStandaloneMode,
  notSupported,
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Solo es una conveniencia para no repetir el modal; si no se puede
      // persistir, no pasa nada.
    }
  };

  const handleActivate = async () => {
    const ok = await requestPermission();
    if (ok) handleDismiss();
  };

  const shouldShow =
    isAuthenticated &&
    typeof window !== 'undefined' &&
    isMobileDevice() &&
    !notSupported &&
    permissionStatus === 'default' &&
    !dismissed;

  if (!shouldShow) return null;

  if (requiresStandaloneMode) {
    return (
      <Modal
        isOpen
        onClose={handleDismiss}
        title="Agregá COFAGU a tu pantalla de inicio"
        description="En iPhone, Safari solo permite activar notificaciones si la app está instalada como acceso directo."
        type="info"
        cancelText="Entendido"
      >
        <ol className="text-sm text-slate-600 dark:text-zinc-400 space-y-2 list-none">
          <li className="flex items-start gap-2">
            <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">1</span>
            <span>Tocá el ícono de <strong className="text-slate-800 dark:text-zinc-200">Compartir</strong> en la barra de Safari</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">2</span>
            <span>Elegí <strong className="text-slate-800 dark:text-zinc-200">"Agregar a inicio"</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">3</span>
            <span>Abrí COFAGU desde el ícono nuevo y entrá a Notificaciones para activarlas</span>
          </li>
        </ol>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={handleDismiss}
      onConfirm={handleActivate}
      title="Activá las notificaciones"
      description="Recibí alertas de nuevos viajes, postulaciones aceptadas y más, directo en tu celular."
      type="info"
      confirmText="Activar Notificaciones"
      cancelText="Ahora no"
      isLoading={loading}
    >
      <ol className="text-sm text-slate-600 dark:text-zinc-400 space-y-2 list-none">
        <li className="flex items-start gap-2">
          <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">1</span>
          <span>Tocá <strong className="text-slate-800 dark:text-zinc-200">"Activar Notificaciones"</strong> y aceptá el permiso que te pida el navegador</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">2</span>
          <span>Para un acceso más rápido, también podés instalar la app: menú (⋮) del navegador → "Instalar app" o "Agregar a pantalla de inicio"</span>
        </li>
      </ol>
    </Modal>
  );
};

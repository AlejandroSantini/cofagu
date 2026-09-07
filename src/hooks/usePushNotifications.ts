import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, isFirebaseConfigured } from '../firebase';
import { authService } from '../api/services';
import { useToast } from './useToast';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Construir URL del SW con las credenciales de Firebase como params
function getServiceWorkerUrl(): string {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

// Detecta si estamos en iOS Safari en modo browser (NO como app instalada)
function isIOSSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua);
  const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return isIOS && !isStandalone;
}

function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function usePushNotifications(isAuthenticated: boolean) {
  const { showToast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [loading, setLoading] = useState(false);

  // true = está en iOS Safari browser, necesita abrir desde el acceso directo
  const requiresStandaloneMode = typeof window !== 'undefined' && isIOSSafariBrowser();
  // true = el browser no soporta push notifications en absoluto
  const notSupported = typeof window !== 'undefined' && !isNotificationSupported() && !isIOSSafariBrowser();

  const requestPermissionAndGetToken = useCallback(async () => {
    const msg = messaging;

    // Debug: loguear estado de configuración
    console.log('[FCM] isFirebaseConfigured:', isFirebaseConfigured);
    console.log('[FCM] messaging:', !!msg);
    console.log('[FCM] VAPID_KEY:', VAPID_KEY ? `${VAPID_KEY.substring(0, 10)}...` : 'MISSING');
    console.log('[FCM] Notification support:', 'Notification' in window);
    console.log('[FCM] ServiceWorker support:', 'serviceWorker' in navigator);

    if (!isFirebaseConfigured || !msg || !VAPID_KEY) {
      const reason = !isFirebaseConfigured ? 'Firebase no configurado' : !msg ? 'Messaging no inicializado' : 'VAPID_KEY faltante';
      console.error('[FCM] Configuración incompleta:', reason);
      showToast(`Error: ${reason}. Verificá las variables de entorno.`, 'error');
      return false;
    }

    if (isIOSSafariBrowser()) {
      showToast('Abrí la app desde el acceso directo en tu pantalla de inicio para activar notificaciones.', 'error');
      return false;
    }

    if (!isNotificationSupported()) {
      showToast('Este navegador no soporta notificaciones push.', 'error');
      return false;
    }

    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      console.log('[FCM] Permission result:', permission);

      if (permission === 'granted') {
        let swRegistration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          const swUrl = getServiceWorkerUrl();
          console.log('[FCM] Registering SW at:', swUrl.substring(0, 80) + '...');
          swRegistration = await navigator.serviceWorker.register(swUrl);
          await navigator.serviceWorker.ready;
          console.log('[FCM] SW ready, state:', swRegistration.active?.state);
        }

        const currentToken = await getToken(msg, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (currentToken) {
          console.log('[FCM] Token OK:', currentToken.substring(0, 20) + '...');
          await authService.registerFcmToken(currentToken);
          showToast('Notificaciones Push activadas en este dispositivo', 'success');
          return true;
        } else {
          console.warn('[FCM] getToken returned empty token');
          showToast('No se pudo obtener el token de notificaciones.', 'error');
        }
      } else {
        showToast('Permiso de notificaciones denegado.', 'error');
      }
    } catch (err) {
      console.error('[FCM] Error:', err);
      showToast(`Error activando notificaciones: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
    return false;
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const msg = messaging;
    if (!isFirebaseConfigured || !msg || !VAPID_KEY) return;

    // Try obtaining token if permission was already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      requestPermissionAndGetToken();
    }

    // Listen to foreground messages
    let unsubscribeOnMessage: (() => void) | undefined;
    try {
      unsubscribeOnMessage = onMessage(msg, (payload) => {
        console.log('[FCM] Message received in foreground:', payload);
        const title = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
        const body = payload.notification?.body || payload.data?.body || '';

        showToast(`${title}: ${body}`, 'success');
      });
    } catch (err) {
      console.error('[FCM] Error setting up onMessage listener:', err);
    }

    return () => {
      if (unsubscribeOnMessage) {
        unsubscribeOnMessage();
      }
    };
  }, [isAuthenticated, requestPermissionAndGetToken]);

  return {
    permissionStatus,
    requestPermission: requestPermissionAndGetToken,
    loading,
    requiresStandaloneMode,
    notSupported,
  };
}

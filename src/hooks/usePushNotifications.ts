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

export function usePushNotifications(isAuthenticated: boolean) {
  const { showToast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [loading, setLoading] = useState(false);

  const requestPermissionAndGetToken = useCallback(async () => {
    const msg = messaging;
    if (!isFirebaseConfigured || !msg || !VAPID_KEY) {
      console.warn('[FCM] Push notifications pending VAPID_KEY or configuration');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported in this browser.');
      return false;
    }

    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        console.log('[FCM] Notification permission granted.');

        let swRegistration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          // Registrar SW con params de Firebase en la URL
          swRegistration = await navigator.serviceWorker.register(getServiceWorkerUrl());
          // Esperar a que el SW esté activo antes de obtener el token
          await navigator.serviceWorker.ready;
        }

        const currentToken = await getToken(msg, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (currentToken) {
          console.log('[FCM] Token retrieved successfully:', currentToken);
          await authService.registerFcmToken(currentToken);
          showToast('Notificaciones Push activadas en este dispositivo', 'success');
          return true;
        } else {
          console.warn('[FCM] No registration token available.');
        }
      } else {
        console.warn('[FCM] Notification permission not granted:', permission);
      }
    } catch (err) {
      console.error('[FCM] Error obtaining token:', err);
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
  };
}

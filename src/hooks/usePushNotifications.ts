import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, isFirebaseConfigured } from '../firebase';
import { authService } from '../api/services';
import { useToast } from './useToast';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function usePushNotifications(isAuthenticated: boolean) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) return;

    const msg = messaging;

    if (!isFirebaseConfigured || !msg || !VAPID_KEY || VAPID_KEY === 'TU_VAPID_KEY') {
      console.warn('[FCM] Push notifications are pending configuration in .env');
      return;
    }

    let unsubscribeOnMessage: () => void;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('[FCM] Notification permission granted.');

          let swRegistration: ServiceWorkerRegistration | undefined = undefined;
          if ('serviceWorker' in navigator) {
            const swParams = new URLSearchParams({
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
              appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
            }).toString();

            swRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${swParams}`);
          }

          const currentToken = await getToken(msg, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration
          });

          if (currentToken) {
            console.log('[FCM] Token retrieved successfully.');
            await authService.registerFcmToken(currentToken);
          } else {
            console.log('[FCM] No registration token available.');
          }
        } else {
          console.log('[FCM] Notification permission not granted.', permission);
        }
      } catch (err) {
        console.error('[FCM] Error obtaining token:', err);
      }
    };

    requestPermissionAndGetToken();

    // Listen to foreground messages
    try {
      unsubscribeOnMessage = onMessage(msg, (payload) => {
        console.log('[FCM] Message received in foreground:', payload);
        
        const title = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
        const body = payload.notification?.body || payload.data?.body;

        showToast(`${title}: ${body}`, 'success');

        let targetUrl = '/';
        const payloadData = payload.data;
        if (payloadData) {
          if (payloadData.applicationId && payloadData.tripId) {
             targetUrl = `/loads/${payloadData.tripId}`; 
          } else if (payloadData.loadId) {
             targetUrl = `/loads/${payloadData.loadId}`;
          } else if (payloadData.tripId) {
             targetUrl = `/loads/${payloadData.tripId}`;
          }
        }
        console.log('[FCM] Suggested deep link from payload:', targetUrl);
      });
    } catch (err) {
      console.error('[FCM] Error setting up onMessage listener', err);
    }

    return () => {
      if (unsubscribeOnMessage) {
        unsubscribeOnMessage();
      }
    };
  }, [isAuthenticated]);
}

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import { authService } from '../api/services';
import { useToast } from './useToast';


const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'TU_VAPID_KEY';

export function usePushNotifications(isAuthenticated: boolean) {
  const { showToast } = useToast();
  // const navigate = useNavigate(); // Could be used if toast allowed passing a callback for onClick

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeOnMessage: () => void;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('[FCM] Notification permission granted.');
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (currentToken) {
            console.log('[FCM] Token retrieved successfully.');
            // Send token to backend
            await authService.registerFcmToken(currentToken);
          } else {
            console.log('[FCM] No registration token available. Request permission to generate one.');
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
      unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('[FCM] Message received in foreground:', payload);
        
        const title = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
        const body = payload.notification?.body || payload.data?.body;

        // Show toast that navigates when clicked
        // We simulate an interactive toast using the message body and adding deep linking logic
        showToast(`${title}: ${body}`, 'success');

        // Optional: If you want to automatically navigate or have a specific button in the toast,
        // you would need to extend your Toast component to support onClick or actions.
        // Currently, we just show the message. But let's log the target URL if they were to click.
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

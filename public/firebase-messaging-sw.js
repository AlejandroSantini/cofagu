importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// TODO: Reemplaza con la configuración de Firebase
firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  
  event.notification.close();
  
  const payloadData = event.notification.data;
  let targetUrl = '/';
  
  if (payloadData) {
    if (payloadData.applicationId && payloadData.tripId) {
       targetUrl = `/loads/${payloadData.tripId}`; 
    } else if (payloadData.loadId) {
       targetUrl = `/loads/${payloadData.loadId}`;
    } else if (payloadData.tripId) {
       targetUrl = `/loads/${payloadData.tripId}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no matching window is open, try to focus any open app window and navigate
      for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
      }

      // If no windows are open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

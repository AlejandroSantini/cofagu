importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Parse configuration from Service Worker script URL search parameters dynamically
const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || "",
  authDomain: params.get('authDomain') || "",
  projectId: params.get('projectId') || "",
  storageBucket: params.get('storageBucket') || "",
  messagingSenderId: params.get('messagingSenderId') || "",
  appId: params.get('appId') || ""
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body,
      icon: '/LOGO COFAGU-02.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

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
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

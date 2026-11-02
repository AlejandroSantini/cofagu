// Cupos completos (TRIP_QUOTA_FILLED): al tocarla se va al listado de viajes
// activos para buscar otra carga, no al viaje que ya se llenó (el `link` que
// manda backend). Tiene que registrarse ANTES de los importScripts: el SDK de
// Firebase agrega su propio 'notificationclick' para las notificaciones que
// dibuja él (con `notification` en el payload) y corta la propagación, así
// que un listener registrado después nunca se entera.
function getNotificationType(notification) {
  const data = notification && notification.data;
  if (!data) return undefined;
  if (data.type) return data.type;
  const fcmMsg = data.FCM_MSG;
  return fcmMsg && fcmMsg.data ? fcmMsg.data.type : undefined;
}

function openAppAt(targetUrl) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
        return client.focus().then((focused) =>
          (focused || client).navigate(targetUrl).catch(() => clients.openWindow(targetUrl))
        );
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  });
}

self.addEventListener('notificationclick', function(event) {
  if (getNotificationType(event.notification) !== 'TRIP_QUOTA_FILLED') return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(openAppAt('/loads'));
});

// La versión DEBE coincidir con la del SDK que usa la app (firebase en package.json).
// Un desfasaje de major (p. ej. SW 10.x con app 12.x) hace que el token se obtenga
// pero las notificaciones en segundo plano nunca se muestren.
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Configuración de Firebase - las credenciales se inyectan dinámicamente desde el entorno
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

    // Si el payload trae "notification", FCM ya la muestra sola en segundo
    // plano antes de llegar acá — si además llamamos a showNotification(),
    // queda duplicada. Solo mostramos manualmente los mensajes "data-only".
    if (payload.notification) {
      return;
    }

    const notificationTitle = payload.data?.title || 'Nueva Notificación';
    const notificationOptions = {
      body: payload.data?.body,
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

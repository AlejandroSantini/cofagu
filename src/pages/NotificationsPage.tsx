import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Bell, CheckCircle, Clock, Check, ArrowRight, XCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { notificationService } from '../api/services';
import type { Notification } from '../types';
import { useNotificationStore } from '../store/useNotificationStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuthStore } from '../store/useAuthStore';
import { isFirebaseConfigured } from '../firebase';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const decrementUnread = useNotificationStore(state => state.decrementUnread);
  const resetUnread = useNotificationStore(state => state.resetUnread);
  const user = useAuthStore(state => state.user);
  const { permissionStatus, requestPermission, loading: pushLoading, requiresStandaloneMode, notSupported } = usePushNotifications(Boolean(user));
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      decrementUnread();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      resetUnread();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_TRIP':
        return <Bell className="h-6 w-6 text-blue-500" />;
      case 'APPLICATION_ACCEPTED':
      case 'TRIP_COMPLETED':
      case 'CTG_REGISTERED':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'TRIP_DELAYED':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'TRIP_CANCELLED':
        return <XCircle className="h-6 w-6 text-rose-500" />;
      case 'TRIP_REJECTED':
        return <AlertTriangle className="h-6 w-6 text-rose-500" />;
      default:
        return <Bell className="h-6 w-6 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <PageHeader 
            title="Notificaciones"
          />
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            isLoading={markingAll}
            variant="outline"
            icon={Check}
          >
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* 🔧 DEBUG PANEL TEMPORAL */}
      <details className="mb-4 bg-zinc-800/50 border border-zinc-700 rounded-md p-3 text-xs font-mono">
          <summary className="text-zinc-400 cursor-pointer select-none">🔧 Debug Push Notifications</summary>
          <div className="mt-2 space-y-1 text-zinc-300">
            <div>Firebase configurado: <span className={`font-bold ${isFirebaseConfigured ? 'text-emerald-400' : 'text-red-400'}`}>{String(isFirebaseConfigured)}</span></div>
            <div>Permiso actual: <span className="font-bold text-amber-300">{permissionStatus}</span></div>
            <div>Standalone (PWA): <span className={`font-bold ${((navigator as Navigator & {standalone?: boolean}).standalone === true || window.matchMedia('(display-mode: standalone)').matches) ? 'text-emerald-400' : 'text-red-400'}`}>{String((navigator as Navigator & {standalone?: boolean}).standalone === true || window.matchMedia('(display-mode: standalone)').matches)}</span></div>
            <div>Requiere standalone: <span className="font-bold">{String(requiresStandaloneMode)}</span></div>
            <div>No soportado: <span className="font-bold">{String(notSupported)}</span></div>
            <div>Notification API: <span className={`font-bold ${'Notification' in window ? 'text-emerald-400' : 'text-red-400'}`}>{String('Notification' in window)}</span></div>
            <div>PushManager: <span className={`font-bold ${'PushManager' in window ? 'text-emerald-400' : 'text-red-400'}`}>{String('PushManager' in window)}</span></div>
            <div>ServiceWorker: <span className={`font-bold ${'serviceWorker' in navigator ? 'text-emerald-400' : 'text-red-400'}`}>{String('serviceWorker' in navigator)}</span></div>
          </div>
        </details>

      {permissionStatus === 'denied' && (
        <div className="bg-red-500/10 border border-red-500/30 dark:bg-red-500/20 dark:border-red-500/40 rounded-md p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-sm bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                Notificaciones bloqueadas por el navegador
              </p>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 mb-3">
                Tu navegador bloqueó el permiso. Tenés que habilitarlo manualmente:
              </p>
              <ol className="text-xs text-slate-600 dark:text-zinc-400 space-y-1 list-none">
                <li className="flex items-start gap-2">
                  <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">1</span>
                  <span>Hacé clic en el <strong className="text-slate-800 dark:text-zinc-200">🔒 candado</strong> en la barra de dirección</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">2</span>
                  <span>Buscá <strong className="text-slate-800 dark:text-zinc-200">"Notifications"</strong> → cambialo a <strong className="text-slate-800 dark:text-zinc-200">"Allow"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">3</span>
                  <span>Recargá la página y volvé a activar las notificaciones</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {permissionStatus === 'default' && (
        <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/20 dark:border-amber-500/40 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                Notificaciones Push inactivas en este dispositivo
              </p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Toca el botón para autorizar las alertas nativas en tu pantalla.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={requestPermission}
            isLoading={pushLoading}
            className="w-full sm:w-auto shrink-0 justify-center"
          >
            Activar Notificaciones
          </Button>
        </div>
      )}


      <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-4 sm:px-6 flex items-center gap-4">
                <Skeleton radius="md" className="h-9 w-9 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : notifications.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {notifications.map((notification) => (
              <li 
                key={notification.id}
                className={`relative group border-l-4 transition-all duration-200 ease-in-out ${
                  !notification.read 
                    ? 'bg-slate-50/80 dark:bg-zinc-800/60 border-l-emerald-500 hover:bg-slate-100 dark:hover:bg-zinc-800' 
                    : 'bg-white dark:bg-zinc-900 border-l-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div 
                  className="px-4 py-4 sm:px-6 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start sm:items-center justify-between">
                    <div className="flex items-start sm:items-center flex-1 min-w-0">
                      <div className={`flex-shrink-0 mt-1 sm:mt-0 p-2 rounded-md ${!notification.read ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'bg-slate-50 dark:bg-zinc-800/50'}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                          <p className={`text-base ${!notification.read ? 'text-slate-900 dark:text-zinc-100 font-bold' : 'text-slate-600 dark:text-zinc-400 font-semibold'} truncate`}>
                            {notification.title}
                          </p>
                          <div className="flex-shrink-0">
                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">
                              {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.createdAt))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1 sm:mt-2 sm:flex sm:justify-between items-center">
                          <div className="sm:flex">
                            <p className={`text-sm leading-relaxed ${!notification.read ? 'text-slate-700 dark:text-zinc-300 font-medium' : 'text-slate-500 dark:text-zinc-500'}`}>
                              {notification.message?.replace(/El transportista ha cargado el CTG/gi, 'El balancero ha cargado el CTG')}
                            </p>
                          </div>
                          {notification.link && (
                            <div className="mt-3 sm:mt-0 flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              Ver detalles
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="ml-4 flex-shrink-0 flex items-center h-full">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/20" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-200">No hay notificaciones</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Estás al día con todas tus notificaciones. Te avisaremos cuando haya algo nuevo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

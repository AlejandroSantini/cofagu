import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Bell, CheckCircle, Clock, Check, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { notificationService } from '../api/services';
import type { Notification } from '../types';
import { useNotificationStore } from '../store/useNotificationStore';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const decrementUnread = useNotificationStore(state => state.decrementUnread);
  const resetUnread = useNotificationStore(state => state.resetUnread);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

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

      <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
                      <div className={`flex-shrink-0 mt-1 sm:mt-0 p-2 rounded-xl ${!notification.read ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'bg-slate-50 dark:bg-zinc-800/50'}`}>
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
                              {notification.message}
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
            <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
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

import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  resetUnread: () => void;
  /** Última push recibida con la app abierta (foreground). Las pantallas que
   * dependen de un evento puntual (ej. Balanza ante TRIP_CANCELLED) se
   * suscriben a esto para refrescar al toque, sin esperar al polling. */
  lastPush: { type?: string; at: number } | null;
  registerPush: (type?: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  resetUnread: () => set({ unreadCount: 0 }),
  lastPush: null,
  registerPush: (type) => set({ lastPush: { type, at: Date.now() } }),
}));

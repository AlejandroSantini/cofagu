import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
  isOperator: () => boolean;
  isPlayero: () => boolean;
  isGasStation: () => boolean;
  isStaff: () => boolean;
  canWrite: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      
      isAdmin: () => get().user?.role === 'ADMIN',
      isEmployee: () => get().user?.role === 'EMPLOYEE',
      isOperator: () => get().user?.role === 'OPERATOR',
      isPlayero: () => get().user?.role === 'PLAYERO',
      isGasStation: () => get().user?.role === 'GAS_STATION',
      isStaff: () => {
        const r = get().user?.role;
        return r === 'ADMIN' || r === 'OPERATOR' || r === 'EMPLOYEE' || r === 'PLAYERO' || r === 'GAS_STATION';
      },
      canWrite: () => {
        const r = get().user?.role;
        return r === 'ADMIN' || r === 'OPERATOR';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

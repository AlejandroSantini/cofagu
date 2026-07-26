import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  Home, 
  Truck, 
  Menu, 
  X, 
  ChevronRight, 
  Settings, 
  Users,
  Briefcase,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isStaff = useAuthStore((state) => state.isStaff());
  const isCarrier = user?.role === 'CARRIER';
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Panel de Control', icon: Home, path: '/' },
    { label: 'Cargas y Viajes', icon: Briefcase, path: '/loads' },
    ...(isStaff ? [
      { label: 'Transportistas', icon: Truck, path: '/carriers' },
    ] : []),
    ...(isCarrier ? [
      { label: 'Choferes', icon: Users, path: '/drivers' },
      { label: 'Camiones', icon: Truck, path: '/trucks' },
    ] : []),
    ...(isAdmin ? [
      { label: 'Personal', icon: Users, path: '/users' }
    ] : []),
    { label: 'Documentación', icon: FileText, path: '/documents' },
    { label: 'Configuración', icon: Settings, path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row overflow-hidden transition-colors duration-300">
      
      {/* MOBILE TOP HEADER */}
      <header className="lg:hidden bg-zinc-100 dark:bg-zinc-950 text-slate-800 dark:text-white p-4 flex items-center h-16 sticky top-0 z-[60] shadow-sm border-b border-zinc-200 dark:border-zinc-900">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-600 dark:text-slate-200"
        >
          <Menu size={24} />
        </button>
        <div className="ml-4 h-16 flex items-center overflow-hidden">
          <img src="/LOGO COFAGU-04.png" alt="COFAGU" className="h-36 w-auto object-contain -ml-2" />
        </div>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/40 dark:bg-black/80 backdrop-blur-sm z-[70] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[80] w-64 bg-zinc-800 dark:bg-zinc-900 text-zinc-100 flex flex-col transform transition-all duration-300 ease-out lg:relative lg:translate-x-0 border-r border-zinc-700/50 dark:border-zinc-800/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-zinc-700/50 dark:border-zinc-800/50 flex items-center justify-center relative overflow-hidden shrink-0">
          <div className="flex items-center justify-center">
            <img src="/LOGO COFAGU-04.png" alt="COFAGU" className="h-48 w-auto object-contain" />
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-700 dark:hover:bg-white/5 rounded-xl text-zinc-300 dark:text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Navigation Links */}
          <nav className="p-4 space-y-2 mt-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive(item.path) 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'text-zinc-300 hover:bg-zinc-700 dark:hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon 
                  size={20} 
                  className={isActive(item.path) ? 'text-white' : 'text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-yellow-400'} 
                />
                <span className="font-bold text-sm">{item.label}</span>
                {isActive(item.path) && <ChevronRight size={16} className="ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="mt-auto p-4 border-t border-zinc-700/50 dark:border-zinc-800 bg-zinc-900/10 dark:bg-zinc-950/20 shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-700/40 dark:bg-white/5 border border-zinc-700/50 dark:border-zinc-800/50 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg">
                {user?.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold truncate text-zinc-100">{user?.name}</p>
                {user?.role !== 'EMPLOYEE' && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">{user?.role}</p>
                )}
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold text-sm transition-colors cursor-pointer"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>

            <div className="mt-8 pt-6 border-t border-zinc-700/50 dark:border-zinc-800 flex justify-center">
              <a href="https://hyssoftware.com/" target="_blank" rel="noopener noreferrer">
                <img 
                  src="/Logo_HyS_horizontal_white.png" 
                  alt="H&S" 
                  className="h-12 mx-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto w-full dark:bg-zinc-950 transition-colors duration-300">
        <div className="px-3 py-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
};

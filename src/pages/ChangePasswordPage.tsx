import React, { useState } from 'react';
import { Lock, Save, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../api/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getErrorMessage } from '../api/errorUtils';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useThemeStore } from '../store/useThemeStore';

export const ChangePasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const { isDarkMode } = useThemeStore();

  const handleLogout = () => {
    logout();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 5) {
      setError('La nueva contraseña debe tener al menos 5 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await authService.changePassword(newPassword);
      if (response.data.success) {
        // Successfully changed, update store state
        if (user && token) {
          setAuth({ ...user, mustChangePassword: false }, token);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al actualizar la contraseña. Intente nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-500 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-600/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-yellow-500/10 dark:bg-yellow-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <img 
            src={isDarkMode ? "/LOGO COFAGU-05.png" : "/LOGO COFAGU-06.png"} 
            alt="COFAGU" 
            className="h-28 mx-auto mb-4 object-contain"
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xl transition-all">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Actualizar Contraseña</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Por razones de seguridad, debes cambiar tu contraseña inicial de acceso para poder continuar operando en el sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorMessage message={error} />

            <Input 
              label="Nueva Contraseña"
              type="password"
              icon={Lock}
              placeholder="Mínimo 5 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="py-2.5"
            />

            <Input 
              label="Confirmar Contraseña"
              type="password"
              icon={Lock}
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="py-2.5"
            />

            <div className="flex flex-col gap-3 pt-2">
              <Button 
                type="submit" 
                isLoading={loading} 
                className="w-full"
                icon={Save}
              >
                Actualizar Contraseña
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleLogout} 
                className="w-full text-slate-600 hover:text-slate-800"
                icon={LogOut}
              >
                Cerrar Sesión
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

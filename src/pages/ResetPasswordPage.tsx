import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Key, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../api/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getErrorMessage } from '../api/errorUtils';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useThemeStore } from '../store/useThemeStore';

export const ResetPasswordPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { isDarkMode } = useThemeStore();

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
    if (!token.trim()) {
      setError('Ingresá el token recibido por WhatsApp.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.resetPassword(token.trim(), newPassword);
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Token inválido o expirado. Solicitá uno nuevo.'));
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

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <img
            src={isDarkMode ? "/LOGO COFAGU-05.png" : "/LOGO COFAGU-06.png"}
            alt="COFAGU"
            className="h-40 mx-auto mb-4 object-contain"
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xl shadow-slate-200/50 dark:shadow-none transition-all">

          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-emerald-500" size={36} />
                </div>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">¡Contraseña Actualizada!</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tu contraseña fue cambiada exitosamente. Redirigiendo al inicio de sesión...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Nueva Contraseña</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ingresá el token que recibiste por WhatsApp y tu nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <ErrorMessage message={error} />

                <Input
                  label="Token de Recuperación"
                  type="text"
                  icon={Key}
                  placeholder="Ej: a3f9b2c1..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="py-2.5 font-mono tracking-widest"
                />

                <Input
                  label="Nueva Contraseña"
                  type={showNewPassword ? "text" : "password"}
                  icon={Lock}
                  placeholder="Mínimo 5 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="py-2.5"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                      title={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <Input
                  label="Confirmar Contraseña"
                  type={showConfirmPassword ? "text" : "password"}
                  icon={Lock}
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="py-2.5"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                      title={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  className="w-full text-base mt-2"
                  isLoading={loading}
                  icon={CheckCircle}
                >
                  Cambiar Contraseña
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center space-y-2">
          <Link
            to="/forgot-password"
            className="block text-sm text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
          >
            ¿No recibiste el token? Solicitá uno nuevo
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

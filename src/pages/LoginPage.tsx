import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../api/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getErrorMessage } from '../api/errorUtils';
import { ErrorMessage } from '../components/ui/ErrorMessage';

import { useThemeStore } from '../store/useThemeStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      window.history.replaceState({}, '', '/login');
      return errorParam;
    }
    return '';
  });
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { isDarkMode } = useThemeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await authService.login(email, password);
      if (response.data.success) {
        setAuth(response.data.data.user, response.data.data.token);
        navigate('/');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Credenciales inválidas. Por favor, intente de nuevo.'));
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorMessage message={error} />

            <Input 
              label="Correo Electrónico"
              type="email"
              icon={Mail}
              placeholder="usuario@cofagu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="py-2.5"
            />

            <Input 
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="py-2.5"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />


            <Button 
              type="submit" 
              className="w-full text-base mt-7" 
              isLoading={loading}
              icon={LogIn}
            >
              Iniciar Sesión
            </Button>
          </form>
        </div>

        <div className="mt-12 flex justify-center">
          <a href="https://hyssoftware.com/" target="_blank" rel="noopener noreferrer">
            <img 
              src={isDarkMode ? "/Logo_HyS_horizontal_white.png" : "/Logo_HyS_horizontal_black.png"} 
              alt="H&S" 
              className="h-12 mx-auto"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useThemeStore } from '../store/useThemeStore';

export const ConfigurationPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();

  const settingsSections = [
    {
      title: 'Apariencia',
      description: 'Personaliza cómo se ve el sistema.',
      icon: Palette,
      content: (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-600'}`}>
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Modo Oscuro</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reduce el cansancio visual por la noche.</p>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isDarkMode ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title="Configuración"
        description="Ajusta las preferencias de tu cuenta y el sistema."
        icon={Monitor}
      />

      <div className="mt-12 space-y-8">
        {settingsSections.map((section, i) => (
          <section key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-4 md:p-8 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-600 dark:text-slate-400">
                <section.icon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{section.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
            </div>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
};

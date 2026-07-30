import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loadSchema, type LoadFormValues } from '../../schemas/load.schema';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MapPin, Calendar, DollarSign, Save, Truck, Users } from 'lucide-react';
import { groupService } from '../../api/services';
import { type CarrierGroup } from '../../types';

interface LoadFormProps {
  onSubmit: (data: LoadFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const LoadForm: React.FC<LoadFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  const [groups, setGroups] = React.useState<CarrierGroup[]>([]);
  const [isDirected, setIsDirected] = React.useState(false);
  const [selectedGroups, setSelectedGroups] = React.useState<Record<number, { checked: boolean; rate: string }>>({});

  React.useEffect(() => {
    let active = true;
    groupService.getGroups().then(res => {
      if (active && res.data.success && res.data.data) {
        setGroups(res.data.data);
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
    mode: 'onChange',
    defaultValues: {
      maxTrucks: '1'
    }
  });

  const mainRate = watch('rate') || '';

  const handleFormSubmit = (data: LoadFormValues) => {
    const targetGroupsPayload = isDirected
      ? Object.entries(selectedGroups)
          .filter(([_, val]) => val.checked)
          .map(([groupId, val]) => ({
            groupId: Number(groupId),
            rate: Number(val.rate || mainRate || 0)
          }))
      : undefined;

    onSubmit({
      ...data,
      targetGroups: targetGroupsPayload
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Origen"
            placeholder="Ej: Buenos Aires"
            icon={MapPin}
            {...register('origin')}
            error={errors.origin?.message}
          />
          <Input
            label="Destino"
            placeholder="Ej: Rosario"
            icon={MapPin}
            {...register('destination')}
            error={errors.destination?.message}
          />
          <Input
            label="Fecha de Carga"
            type="date"
            icon={Calendar}
            {...register('loadingDate')}
            error={errors.loadingDate?.message}
          />
          <Input
            label="Fecha de Cupo"
            type="date"
            icon={Calendar}
            {...register('quotaDate')}
            error={errors.quotaDate?.message}
          />
          <Input
            label="Horario Inicio Carga"
            type="time"
            {...register('loadingTimeStart')}
            error={errors.loadingTimeStart?.message}
          />
          <Input
            label="Horario Límite Carga"
            type="time"
            {...register('loadingTimeEnd')}
            error={errors.loadingTimeEnd?.message}
          />
          <Input
            label="Cereal / Producto"
            placeholder="Ej: Soja, Maíz"
            {...register('cereal')}
            error={errors.cereal?.message}
          />
          <Input
            label="Tarifa ($)"
            type="number"
            placeholder="Ej: 500000"
            icon={DollarSign}
            {...register('rate')}
            error={errors.rate?.message}
          />
          <div className="md:col-span-2">
            <Input
              label="Cantidad de camiones necesarios"
              type="number"
              min="1"
              placeholder="Ej: 1"
              icon={Truck}
              {...register('maxTrucks')}
              error={errors.maxTrucks?.message}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Observaciones</label>
            <textarea
              className="w-full bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white border-slate-100 dark:border-zinc-800 focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
              placeholder="Ej: Carga frágil, requiere lona..."
              {...register('notes')}
            />
          </div>
        </div>

        {/* Directed Publication Section */}
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-emerald-600 dark:text-emerald-400" size={20} />
              <h3 className="text-md font-bold text-slate-800 dark:text-zinc-200">
                Dirigir Publicación a Grupos Específicos
              </h3>
            </div>
            {groups.length > 0 && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isDirected} 
                  onChange={(e) => setIsDirected(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                  {isDirected ? 'Activado' : 'Desactivado'}
                </span>
              </label>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-550 italic bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-slate-150/50 dark:border-zinc-800">
              No hay grupos de transportistas registrados. Puedes crearlos desde la sección de transportistas para habilitar la publicación dirigida.
            </p>
          ) : (
            isDirected && (
              <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-5 border border-slate-100 dark:border-zinc-800 space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Seleccione los grupos y defina la tarifa correspondiente:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((group) => {
                    const groupState = selectedGroups[group.id] || { checked: false, rate: '' };
                    return (
                      <div 
                        key={group.id} 
                        className={`flex flex-col p-4 rounded-xl border transition-all ${
                          groupState.checked 
                            ? 'bg-white dark:bg-zinc-900 border-emerald-500/30 shadow-sm' 
                            : 'border-slate-200/60 dark:border-zinc-850 hover:bg-slate-100/40 dark:hover:bg-zinc-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={groupState.checked}
                              onChange={(e) => {
                                setSelectedGroups(prev => ({
                                  ...prev,
                                  [group.id]: {
                                    ...groupState,
                                    checked: e.target.checked,
                                    rate: groupState.rate || mainRate
                                  }
                                }));
                              }}
                              className="rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">{group.name}</span>
                              {group.description && (
                                <p className="text-xs text-slate-400 dark:text-zinc-500">{group.description}</p>
                              )}
                            </div>
                          </label>
                        </div>

                        {groupState.checked && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">
                              Tarifa para este Grupo ($) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input
                                type="number"
                                placeholder={mainRate || '0'}
                                value={groupState.rate}
                                onChange={(e) => {
                                  setSelectedGroups(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      ...groupState,
                                      rate: e.target.value
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!isValid} icon={Save}>
            Publicar
          </Button>
        </div>
      </form>
    </div>
  );
};

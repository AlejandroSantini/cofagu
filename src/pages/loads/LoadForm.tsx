import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loadSchema, type LoadFormValues } from '../../schemas/load.schema';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MapPin, Calendar, DollarSign, Save, Truck } from 'lucide-react';

interface LoadFormProps {
  onSubmit: (data: LoadFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const LoadForm: React.FC<LoadFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
    mode: 'onChange',
    defaultValues: {
      maxTrucks: '1'
    }
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            {...register('date')}
            error={errors.date?.message}
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

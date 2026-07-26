 import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { truckSchema, type TruckFormValues } from '../schemas/truck.schema';
import { truckService, carrierService } from '../api/services';
import { type Truck, type Carrier } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../hooks/useConfirm';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, ChevronLeft, Save, Trash2, TruckIcon, FileText, Scale, Building2, ShieldCheck } from 'lucide-react';

export const TrucksPage: React.FC = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delId, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number>();

  const user = useAuthStore((state) => state.user);
  const isCarrier = user?.role === 'CARRIER';
  const canWriteTrucks = useAuthStore((state) => state.isAdmin() || state.isOperator() || state.user?.role === 'CARRIER');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid }
  } = useForm<TruckFormValues>({
    resolver: zodResolver(truckSchema),
    mode: 'onChange',
    defaultValues: {
      plate: '',
      type: '',
      capacity: '',
      carrierId: '',
      insurancePolicy: '',
      insuranceCompany: '',
      insuranceExpiration: ''
    }
  });

  const fetchData = async () => {
    try {
      const [trkRes, crrRes] = await Promise.all([
        truckService.getTrucks(),
        isCarrier ? Promise.resolve({ data: { success: true, data: [] } }) : carrierService.getCarriers()
      ]);

      if (trkRes.data.success) setTrucks(trkRes.data.data);
      if (crrRes.data.success) setCarriers(crrRes.data.data as Carrier[]);
    } catch (err) {
      console.error(err);
      setError('Error al cargar camiones o transportistas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [trkRes, crrRes] = await Promise.all([
          truckService.getTrucks(),
          isCarrier ? Promise.resolve({ data: { success: true, data: [] } }) : carrierService.getCarriers()
        ]);
        if (active) {
          if (trkRes.data.success) setTrucks(trkRes.data.data);
          if (crrRes.data.success) setCarriers(crrRes.data.data as Carrier[]);
        }
      } catch (err) {
        console.error(err);
        if (active) setError('Error al cargar camiones o transportistas.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isCarrier]);

  const handleEdit = (truck: Truck) => {
    setEditingId(truck.id);
    setValue('plate', truck.plate);
    setValue('type', truck.type);
    setValue('capacity', String(truck.capacity));
    setValue('carrierId', truck.carrierId ? String(truck.carrierId) : '');
    setValue('insurancePolicy', truck.insurancePolicy || '');
    setValue('insuranceCompany', truck.insuranceCompany || '');
    setValue('insuranceExpiration', truck.insuranceExpiration ? new Date(truck.insuranceExpiration).toISOString().split('T')[0] : '');
    setShowForm(true);
  };

  const onSubmit = async (data: TruckFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload: any = {
        plate: data.plate,
        type: data.type,
        capacity: Number(data.capacity),
        insurancePolicy: data.insurancePolicy || undefined,
        insuranceCompany: data.insuranceCompany || undefined,
        insuranceExpiration: data.insuranceExpiration ? new Date(data.insuranceExpiration).toISOString() : undefined
      };

      if (!isCarrier) {
        payload.carrierId = Number(data.carrierId);
      }

      const res = editingId
        ? await truckService.updateTruck(editingId, payload)
        : await truckService.createTruck(payload);

      if (res.data.success) {
        showToast(editingId ? 'Camión actualizado con éxito' : 'Camión creado con éxito');
        handleBack();
        setLoading(true);
        fetchData();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el camión.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setSubmitLoading(true);
    try {
      const res = await truckService.deleteTruck(delId);
      if (res.data.success) {
        showToast('Camión eliminado con éxito');
        confirmDelete();
        setLoading(true);
        fetchData();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar el camión.'));
      cancelDelete();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingId(null);
    reset({
      plate: '',
      type: '',
      capacity: '',
      carrierId: '',
      insurancePolicy: '',
      insuranceCompany: '',
      insuranceExpiration: ''
    });
    setError('');
  };

  const columns = [
    {
      header: 'Patente / Dominio',
      render: (t: Truck) => (
        <span className="font-bold font-mono text-slate-900 dark:text-white uppercase">{t.plate}</span>
      )
    },
    {
      header: 'Tipo de Acoplado / Camión',
      render: (t: Truck) => (
        <span className="text-slate-600 dark:text-zinc-400">{t.type}</span>
      )
    },
    {
      header: 'Capacidad (kg)',
      render: (t: Truck) => (
        <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
          <Scale size={14} className="opacity-60" />
          {t.capacity.toLocaleString()} kg
        </span>
      )
    },
    ...(!isCarrier ? [
      {
        header: 'Transportista',
        render: (t: Truck) => (
          <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-semibold">
            <Building2 size={14} className="opacity-60" />
            {t.carrier?.name || 'Desconocido'}
          </span>
        )
      }
    ] : []),
    {
      header: 'Seguro / Póliza',
      render: (t: Truck) => t.insurancePolicy ? (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-zinc-200">{t.insuranceCompany} ({t.insurancePolicy})</p>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">Vence: {t.insuranceExpiration ? new Date(t.insuranceExpiration).toLocaleDateString('es-AR') : 'N/D'}</p>
        </div>
      ) : <span className="text-slate-400 text-xs italic">No declarado</span>
    },
    ...(canWriteTrucks ? [
      {
        header: 'Acciones',
        className: 'w-24 text-right',
        render: (t: Truck) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              iconClassName="text-rose-500"
              onClick={() => askDelete(t.id)}
              title="Eliminar"
            />
          </div>
        )
      }
    ] : [])
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      <Modal
        isOpen={isDelOpen}
        onClose={cancelDelete}
        onConfirm={handleDelete}
        title="Eliminar Camión"
        description="¿Estás seguro de que deseas eliminar este camión? Se desactivará de forma permanente."
        type="danger"
        confirmText="Eliminar"
        isLoading={submitLoading}
      />

      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          title={showForm ? (editingId ? 'Editar Camión' : 'Nuevo Camión') : 'Camiones registrados'}
          description={showForm ? 'Completa los datos del camión.' : 'Flota de camiones registrados para el transporte y la logística.'}
        />

        {canWriteTrucks && (
          <div>
            <Button
              variant={showForm ? 'outline' : 'primary'}
              onClick={() => {
                if (showForm) handleBack();
                else setShowForm(true);
              }}
              icon={showForm ? ChevronLeft : Plus}
              className="w-full md:w-fit px-8"
            >
              {showForm ? 'Volver al Listado' : 'Nuevo Camión'}
            </Button>
          </div>
        )}
      </div>

      <ErrorMessage message={error} className="mb-6" />

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Patente / Dominio"
                placeholder="Ej: AA123BB o ABC123"
                icon={TruckIcon}
                {...register('plate')}
                error={errors.plate?.message}
              />
              <Input
                label="Tipo de Acoplado / Camión"
                placeholder="Ej: Chasis, Semirremolque"
                icon={FileText}
                {...register('type')}
                error={errors.type?.message}
              />
              <Input
                label="Capacidad Útil (kg)"
                placeholder="Ej: 28000"
                icon={Scale}
                {...register('capacity')}
                error={errors.capacity?.message}
              />
              {!isCarrier && (
                <Select
                  label="Empresa Transportista"
                  icon={Building2}
                  options={[
                    { value: '', label: 'Seleccione un transportista' },
                    ...carriers.map((c) => ({ value: String(c.id), label: c.name }))
                  ]}
                  {...register('carrierId')}
                  error={errors.carrierId?.message}
                />
              )}
            </div>

            {/* Insurance Info Section */}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-6">
              <h3 className="text-md font-bold text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                Seguro Obligatorio del Camión (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Póliza de seguro"
                  placeholder="Ej: POL-123456"
                  icon={FileText}
                  {...register('insurancePolicy')}
                  error={errors.insurancePolicy?.message}
                />
                <Input
                  label="Compañía aseguradora"
                  placeholder="Ej: La Segunda"
                  icon={Building2}
                  {...register('insuranceCompany')}
                  error={errors.insuranceCompany?.message}
                />
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Fecha de vencimiento
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                      {...register('insuranceExpiration')}
                    />
                  </div>
                  {errors.insuranceExpiration && (
                    <p className="text-xs text-rose-500 mt-1">{errors.insuranceExpiration.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button type="button" variant="secondary" onClick={handleBack}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submitLoading} disabled={!isValid} icon={Save}>
                Guardar
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <Table
          columns={columns}
          data={trucks}
          isLoading={loading}
          onRowClick={canWriteTrucks ? handleEdit : undefined}
        />
      )}
    </div>
  );
};

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
import { ImageUpload } from '../components/ui/ImageUpload';

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
    watch,
    formState: { errors, isValid }
  } = useForm<TruckFormValues>({
    resolver: zodResolver(truckSchema),
    mode: 'onChange',
    defaultValues: {
      chassisPlate: '',
      trailerPlate: '',
      type: '',
      capacity: '',
      carrierId: '',
      insurancePolicy: '',
      insuranceCompany: '',
      insuranceExpiration: '',
      insurancePolicyPhotoUrl: ''
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
    setValue('chassisPlate', truck.chassisPlate || truck.plate || '');
    setValue('trailerPlate', truck.trailerPlate || '');
    setValue('type', truck.type as any);
    setValue('capacity', String(truck.capacity));
    setValue('carrierId', truck.carrierId ? String(truck.carrierId) : '');
    setValue('insurancePolicy', truck.insurancePolicy || '');
    setValue('insuranceCompany', truck.insuranceCompany || '');
    setValue('insuranceExpiration', truck.insuranceExpiration ? new Date(truck.insuranceExpiration).toISOString().split('T')[0] : '');
    setValue('insurancePolicyPhotoUrl', truck.insurancePolicyPhotoUrl || '');
    setShowForm(true);
  };

  const onSubmit = async (data: TruckFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload: any = {
        chassisPlate: data.chassisPlate,
        trailerPlate: data.trailerPlate,
        plate: data.chassisPlate, // Fallback/mapping for plate in backend
        type: data.type,
        capacity: Number(data.capacity),
        insurancePolicy: data.insurancePolicy,
        insuranceCompany: data.insuranceCompany || undefined,
        insuranceExpiration: new Date(data.insuranceExpiration).toISOString(),
        insurancePolicyPhotoUrl: data.insurancePolicyPhotoUrl
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
      chassisPlate: '',
      trailerPlate: '',
      type: '',
      capacity: '',
      carrierId: '',
      insurancePolicy: '',
      insuranceCompany: '',
      insuranceExpiration: '',
      insurancePolicyPhotoUrl: ''
    });
    setError('');
  };

  const TYPE_LABELS: Record<string, string> = {
    BATEA: 'Bateas',
    TOLVA: 'Tolvas',
    CHASIS_Y_ACOPLADO: 'Chasis y Acoplados',
    SEMI: 'Semis',
    SEMI_TOLVA: 'Semi Tolva'
  };

  const isInsuranceExpired = (expirationDate?: string) => {
    if (!expirationDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(expirationDate);
    return expiration < today;
  };

  const columns = [
    {
      header: 'Patentes (Chasis / Acoplado)',
      render: (t: Truck) => (
        <div className="flex flex-col">
          <span className="font-bold font-mono text-slate-900 dark:text-white uppercase">Chasis: {t.chassisPlate || t.plate || 'N/D'}</span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">Acoplado: {t.trailerPlate || 'N/D'}</span>
        </div>
      )
    },
    {
      header: 'Tipo de Camión',
      render: (t: Truck) => (
        <span className="text-slate-600 dark:text-zinc-400 font-semibold">{TYPE_LABELS[t.type] || t.type}</span>
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
      render: (t: Truck) => {
        const expired = isInsuranceExpired(t.insuranceExpiration);
        const incomplete = !t.insurancePolicy || !t.insurancePolicyPhotoUrl;

        return (
          <div className="text-xs space-y-1">
            {incomplete ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                Seguro Incompleto - Bloqueado
              </span>
            ) : expired ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                Seguro Vencido - Bloqueado
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                Seguro Vigente
              </span>
            )}
            <p className="font-bold text-slate-800 dark:text-zinc-200 mt-1">Póliza: {t.insurancePolicy || 'N/D'}</p>
            <p className="text-slate-500 dark:text-slate-400">Vence: {t.insuranceExpiration ? new Date(t.insuranceExpiration).toLocaleDateString('es-AR') : 'N/D'}</p>
          </div>
        );
      }
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
                label="Patente del Chasis (Tractor) *"
                placeholder="Ej: AA123BB o ABC123"
                icon={TruckIcon}
                {...register('chassisPlate')}
                error={errors.chassisPlate?.message}
              />
              <Input
                label="Patente del Acoplado *"
                placeholder="Ej: AB456CD o XYZ789"
                icon={TruckIcon}
                {...register('trailerPlate')}
                error={errors.trailerPlate?.message}
              />
              <Select
                label="Tipo de Camión *"
                icon={FileText}
                options={[
                  { value: '', label: 'Seleccione un tipo' },
                  { value: 'BATEA', label: 'Bateas' },
                  { value: 'TOLVA', label: 'Tolvas' },
                  { value: 'CHASIS_Y_ACOPLADO', label: 'Chasis y Acoplados' },
                  { value: 'SEMI', label: 'Semis' },
                  { value: 'SEMI_TOLVA', label: 'Semi Tolva' }
                ]}
                {...register('type')}
                error={errors.type?.message}
              />
              <Input
                label="Capacidad Útil (Kilos Netos) *"
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
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-6 space-y-6">
              <h3 className="text-md font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                Seguro Obligatorio del Camión *
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Póliza de seguro *"
                  placeholder="Ej: POL-123456"
                  icon={FileText}
                  {...register('insurancePolicy')}
                  error={errors.insurancePolicy?.message}
                />
                <Input
                  label="Compañía aseguradora (Opcional)"
                  placeholder="Ej: La Segunda"
                  icon={Building2}
                  {...register('insuranceCompany')}
                  error={errors.insuranceCompany?.message}
                />
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Fecha de vencimiento *
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

              <div>
                <ImageUpload
                  label="Foto/Copia de la Póliza de Seguro *"
                  value={watch('insurancePolicyPhotoUrl') || ''}
                  onChange={(url) => setValue('insurancePolicyPhotoUrl', url, { shouldValidate: true })}
                />
                {errors.insurancePolicyPhotoUrl && (
                  <p className="text-xs text-rose-500 mt-1">{errors.insurancePolicyPhotoUrl.message}</p>
                )}
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

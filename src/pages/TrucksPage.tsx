import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../hooks/useConfirm';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, ChevronLeft, Save, Trash2, TruckIcon, FileText, Scale, Building2, ShieldCheck, Download } from 'lucide-react';

import { ImageUpload, SecureImage } from '../components/ui/ImageUpload';

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

export const TrucksPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [error, setError] = useState('');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delId, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number>();

  const isAdmin = useAuthStore((state) => state.isAdmin());
  const user = useAuthStore((state) => state.user);
  const isCarrier = user?.role === 'CARRIER';
  const canWriteTrucks = useAuthStore((state) => state.isAdmin() || state.isOperator() || state.isLogistics() || state.user?.role === 'CARRIER');

  
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredTrucks = trucks.filter((t) => {
    if (typeFilter === 'ALL') return true;
    if (typeFilter === 'TOLVA') return t.type === 'TOLVA' || t.type === 'SEMI_TOLVA';
    if (typeFilter === 'BATEA') return t.type === 'BATEA';
    return t.type === typeFilter;
  });





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
      cargoInsurancePolicy: '',
      cargoInsuranceCompany: '',
      cargoInsuranceExpiration: '',
      cargoInsurancePhotoUrl: ''
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
    fetchData();
  }, [isCarrier]);

  useAutoRefresh(fetchData);

  useEffect(() => {
    let active = true;
    const fetchSelectedTruck = async () => {
      if (!id) {
        if (active) {
          setShowForm(false);
          setEditingId(null);
          reset({
            chassisPlate: '',
            trailerPlate: '',
            type: '',
            capacity: '',
            carrierId: '',
            cargoInsurancePolicy: '',
            cargoInsuranceCompany: '',
            cargoInsuranceExpiration: '',
            cargoInsurancePhotoUrl: ''
          });
        }
        return;
      }
      try {
        const res = await truckService.getTruck(Number(id));
        if (active && res.data.success) {
          const truck = res.data.data;
          setEditingId(truck.id);
          setValue('chassisPlate', truck.chassisPlate || truck.plate || '');
          setValue('trailerPlate', truck.trailerPlate || '');
          setValue('type', truck.type as any);
          setValue('capacity', String(truck.capacity));
          setValue('carrierId', truck.carrierId ? String(truck.carrierId) : '');
          setValue('cargoInsurancePolicy', truck.cargoInsurancePolicy || '');
          setValue('cargoInsuranceCompany', truck.cargoInsuranceCompany || '');
          setValue('cargoInsuranceExpiration', truck.cargoInsuranceExpiration ? new Date(truck.cargoInsuranceExpiration).toISOString().split('T')[0] : '');
          setValue('cargoInsurancePhotoUrl', truck.cargoInsurancePhotoUrl || '');
          setShowForm(true);
        }
      } catch (err) {
        console.error(err);
        if (active) showToast('Error al cargar detalles del camión.', 'error');
      }
    };
    fetchSelectedTruck();
    return () => { active = false; };
  }, [id, setValue]);

  const handleBack = () => {
    if (id) {
      navigate('/trucks');
    } else {
      setShowForm(false);
      setEditingId(null);
      reset({
        chassisPlate: '',
        trailerPlate: '',
        type: '',
        capacity: '',
        carrierId: '',
        cargoInsurancePolicy: '',
        cargoInsuranceCompany: '',
        cargoInsuranceExpiration: '',
        cargoInsurancePhotoUrl: ''
      });
      setError('');
    }
  };

  const handleEdit = (truck: Truck) => {
    navigate(`/trucks/${truck.id}`);
  };

  const handleApproveInsurance = async (truck: Truck, status: 'APPROVED' | 'REJECTED') => {
    setSubmitLoading(true);
    try {
      const res = await truckService.updateTruck(truck.id, {
        insuranceStatus: status,
        cargoInsuranceStatus: status
      } as any);
      if (res.data.success) {
        showToast(status === 'APPROVED' ? 'Seguro aprobado y camión habilitado.' : 'Seguro rechazado.', status === 'APPROVED' ? 'success' : 'error');
        setLoading(true);
        fetchData();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al actualizar estado del seguro.'), 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const onSubmit = async (data: TruckFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload: any = {
        chassisPlate: data.chassisPlate,
        trailerPlate: data.trailerPlate,
        plate: data.chassisPlate,
        type: data.type,
        capacity: Number(data.capacity),
        cargoInsurancePolicy: data.cargoInsurancePolicy,
        cargoInsuranceCompany: data.cargoInsuranceCompany || undefined,
        cargoInsuranceExpiration: new Date(data.cargoInsuranceExpiration).toISOString(),
        cargoInsurancePhotoUrl: data.cargoInsurancePhotoUrl
      };

      if (isCarrier) {
        payload.cargoInsuranceStatus = 'PENDING';
      } else {
        payload.carrierId = Number(data.carrierId);
      }

      const res = editingId
        ? await truckService.updateTruck(editingId, payload)
        : await truckService.createTruck(payload);

      if (res.data.success) {
        const successMsg = isCarrier
          ? 'Los datos del seguro se enviaron a revisión de la administración y el camión quedará temporalmente inhabilitado.'
          : (editingId ? 'Camión actualizado con éxito' : 'Camión creado con éxito');
        showToast(successMsg, 'success');
        if (id) {
          navigate('/trucks');
        } else {
          handleBack();
        }
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

  const columns = [
    {
      header: 'Estado Habilitación',
      render: (t: Truck) => {
        const isSuspended = t.isSuspended || (t.suspendedUntil ? new Date(t.suspendedUntil) > new Date() : false);
        const isHabilitado = !isSuspended && t.habilitado !== false && (t.cargoInsuranceStatus === 'APPROVED' || t.insuranceStatus === 'APPROVED');
        const isPending = t.cargoInsuranceStatus === 'PENDING';


        return (
          <div className="flex flex-col gap-1">
            {isSuspended ? (
              <span 
                title={`Suspendido hasta el ${t.suspendedUntil ? new Date(t.suspendedUntil).toLocaleDateString('es-AR') : 'N/D'} por inasistencias`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 w-fit"
              >
                Suspendido ({t.suspendedUntil ? new Date(t.suspendedUntil).toLocaleDateString('es-AR') : 'Inasistencia'})
              </span>
            ) : isHabilitado ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Habilitado
              </span>
            ) : isPending ? (
              <span 
                title="Requiere seguros vigentes y aprobados por la administración"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 cursor-help w-fit"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                En Revisión
              </span>
            ) : (
              <span 
                title="Requiere seguros vigentes y aprobados por la administración"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40 cursor-help w-fit"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Inhabilitado
              </span>
            )}
            {isCarrier && !isHabilitado && !isSuspended && (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic max-w-[160px]">
                Requiere seguros vigentes y aprobados por la administración.
              </span>
            )}
          </div>
        );
      }
    },

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
      header: 'Seguro de Carga',
      render: (t: Truck) => {
        const expired = isInsuranceExpired(t.cargoInsuranceExpiration);
        const incomplete = !t.cargoInsurancePolicy || !t.cargoInsurancePhotoUrl;
        const status = t.cargoInsuranceStatus || (incomplete ? 'REJECTED' : expired ? 'REJECTED' : 'APPROVED');

        return (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center gap-1.5">
              {status === 'PENDING' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/55 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pendiente de Revisión
                </span>
              ) : status === 'APPROVED' && !expired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/55 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550" />
                  Aprobado / Vigente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/55 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {expired ? 'Vencido' : 'Rechazado / Incompleto'}
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-0.5 font-medium pl-1">
              <p className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider w-10">Póliza:</span> 
                <span className="font-mono text-slate-700 dark:text-zinc-300">{t.cargoInsurancePolicy || t.insurancePolicy || 'N/D'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider w-10">Vence:</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300">
                  {t.cargoInsuranceExpiration ? new Date(t.cargoInsuranceExpiration).toLocaleDateString('es-AR') : t.insuranceExpiration ? new Date(t.insuranceExpiration).toLocaleDateString('es-AR') : 'N/D'}
                </span>
              </p>
              {(t.cargoInsurancePhotoUrl || t.insurancePolicyPhotoUrl) && (
                <div className="flex gap-2 pt-1">
                  {t.cargoInsurancePhotoUrl && (
                    <button
                      type="button"
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-[10px] flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(t.cargoInsurancePhotoUrl!); setPreviewTitle('Foto Póliza Carga'); }}
                    >
                      <Download size={12} /> Foto Póliza Carga
                    </button>
                  )}
                  {t.insurancePolicyPhotoUrl && (
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-[10px] flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(t.insurancePolicyPhotoUrl!); setPreviewTitle('Foto Seguro General'); }}
                    >
                      <Download size={12} /> Foto Seguro General
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Admin approval actions */}
            {isAdmin && (
              <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] py-0.5 px-2 h-6 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => handleApproveInsurance(t, 'APPROVED')}
                  isLoading={submitLoading}
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] py-0.5 px-2 h-6 border-rose-500/40 text-rose-600 hover:bg-rose-50"
                  onClick={() => handleApproveInsurance(t, 'REJECTED')}
                  isLoading={submitLoading}
                >
                  Rechazar
                </Button>
              </div>
            )}

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

      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title={previewTitle}
        cancelText="Cerrar"
        imageOnly
      >
        <div className="flex justify-center items-center">
          {previewUrl && (
            <SecureImage src={previewUrl} className="max-w-[95vw] max-h-[90vh] w-auto h-auto rounded-xl shadow-2xl object-contain" />
          )}
        </div>
      </Modal>

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
                else {
                  navigate('/trucks');
                  setShowForm(true);
                  setEditingId(null);
                  reset({
                    chassisPlate: '',
                    trailerPlate: '',
                    type: '',
                    capacity: '',
                    carrierId: '',
                    cargoInsurancePolicy: '',
                    cargoInsuranceCompany: '',
                    cargoInsuranceExpiration: '',
                    cargoInsurancePhotoUrl: ''
                  });
                }
              }}
              icon={showForm ? ChevronLeft : Plus}
              className="w-full md:w-fit px-8"
            >
              {showForm ? 'Volver al Listado' : 'Nuevo Camión'}
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

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

            {/* Cargo Insurance Info Section (Required) */}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-6 space-y-6">
              <h3 className="text-md font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                Seguro Obligatorio de la Carga (Requerido) *
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <Input
                  label="Nro. de Póliza *"
                  placeholder="Ej: CAR-123456"
                  icon={FileText}
                  {...register('cargoInsurancePolicy')}
                  error={errors.cargoInsurancePolicy?.message}
                />
                <Input
                  label="Aseguradora (Opcional)"
                  placeholder="Ej: La Segunda"
                  icon={Building2}
                  {...register('cargoInsuranceCompany')}
                  error={errors.cargoInsuranceCompany?.message}
                />
                <Input
                  label="Fecha de vencimiento *"
                  type="date"
                  {...register('cargoInsuranceExpiration')}
                  error={errors.cargoInsuranceExpiration?.message}
                />
              </div>

              <div className="pt-2">
                <ImageUpload
                  label="Foto/Copia de la Póliza del Seguro de Carga *"
                  value={watch('cargoInsurancePhotoUrl') || ''}
                  onChange={(url) => setValue('cargoInsurancePhotoUrl', url, { shouldValidate: true })}
                  error={errors.cargoInsurancePhotoUrl?.message}
                />
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
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
              Filtrar por Tipo de Camión:
            </span>
            <div className="w-64">
              <Select
                options={[
                  { value: 'ALL', label: 'Todos los tipos' },
                  { value: 'TOLVA', label: 'Tolva / Semi Tolva' },
                  { value: 'BATEA', label: 'Batea' },
                  { value: 'CHASIS_Y_ACOPLADO', label: 'Chasis y Acoplado' },
                  { value: 'SEMI', label: 'Semi' }
                ]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              />
            </div>
          </div>
          <Table
            columns={columns}
            data={filteredTrucks}
            isLoading={loading}
            onRowClick={canWriteTrucks ? handleEdit : undefined}
          />
        </div>
      )}

    </div>
  );
};

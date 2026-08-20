import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema, type DriverFormValues } from '../schemas/driver.schema';
import { driverService, carrierService } from '../api/services';
import { type Driver, type Carrier } from '../types';
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
import { Plus, ChevronLeft, Save, Trash2, User, Phone, FileText, Building2 } from 'lucide-react';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
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
  const canWriteDrivers = useAuthStore((state) => state.isAdmin() || state.isOperator() || state.isLogistics() || state.user?.role === 'CARRIER');


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid }
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      dni: '',
      phone: '',
      carrierId: ''
    }
  });

  const fetchData = async () => {
    try {
      const [drvRes, crrRes] = await Promise.all([
        driverService.getDrivers(),
        isCarrier ? Promise.resolve({ data: { success: true, data: [] } }) : carrierService.getCarriers()
      ]);

      if (drvRes.data.success) setDrivers(drvRes.data.data);
      if (crrRes.data.success) setCarriers(crrRes.data.data as Carrier[]);
    } catch (err) {
      console.error(err);
      setError('Error al cargar choferes o transportistas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [drvRes, crrRes] = await Promise.all([
          driverService.getDrivers(),
          isCarrier ? Promise.resolve({ data: { success: true, data: [] } }) : carrierService.getCarriers()
        ]);
        if (active) {
          if (drvRes.data.success) setDrivers(drvRes.data.data);
          if (crrRes.data.success) setCarriers(crrRes.data.data as Carrier[]);
        }
      } catch (err) {
        console.error(err);
        if (active) setError('Error al cargar choferes o transportistas.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isCarrier]);

  const handleEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setValue('name', driver.name);
    setValue('dni', driver.dni);
    setValue('phone', driver.phone);
    setValue('carrierId', driver.carrierId ? String(driver.carrierId) : '');
    setShowForm(true);
  };

  const onSubmit = async (data: DriverFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload: any = {
        name: data.name,
        dni: data.dni,
        phone: data.phone
      };

      if (!isCarrier) {
        payload.carrierId = Number(data.carrierId);
      }

      const res = editingId
        ? await driverService.updateDriver(editingId, payload)
        : await driverService.createDriver(payload);

      if (res.data.success) {
        showToast(editingId ? 'Chofer actualizado con éxito' : 'Chofer creado con éxito');
        handleBack();
        setLoading(true);
        fetchData();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el chofer.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setSubmitLoading(true);
    try {
      const res = await driverService.deleteDriver(delId);
      if (res.data.success) {
        showToast('Chofer eliminado con éxito');
        confirmDelete();
        setLoading(true);
        fetchData();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar el chofer.'));
      cancelDelete();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingId(null);
    reset({
      name: '',
      dni: '',
      phone: '',
      carrierId: ''
    });
    setError('');
  };

  const columns = [
    {
      header: 'Nombre y Apellido',
      render: (d: Driver) => (
        <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
      )
    },
    {
      header: 'DNI',
      render: (d: Driver) => (
        <span className="font-mono text-sm text-slate-600 dark:text-zinc-400">{d.dni}</span>
      )
    },
    {
      header: 'Teléfono',
      render: (d: Driver) => (
        <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
          <Phone size={14} className="opacity-60" />
          {d.phone}
        </span>
      )
    },
    {
      header: 'Estado / Suspensión',
      render: (d: Driver) => {
        const isSuspended = d.isSuspended || (d.suspendedUntil ? new Date(d.suspendedUntil) > new Date() : false);
        return isSuspended ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400">
            Suspendido ({d.suspendedUntil ? new Date(d.suspendedUntil).toLocaleDateString('es-AR') : 'Inasistencias'})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400">
            Habilitado
          </span>
        );
      }
    },
    ...(!isCarrier ? [
      {
        header: 'Transportista',
        render: (d: Driver) => (
          <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-semibold">
            <Building2 size={14} className="opacity-60" />
            {d.carrier?.name || 'Desconocido'}
          </span>
        )
      }
    ] : []),
    ...(canWriteDrivers ? [
      {
        header: 'Acciones',
        className: 'w-24 text-right',
        render: (d: Driver) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              iconClassName="text-rose-500"
              onClick={() => askDelete(d.id)}
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
        title="Eliminar Chofer"
        description="¿Estás seguro de que deseas eliminar este chofer? Se desactivará de forma permanente."
        type="danger"
        confirmText="Eliminar"
        isLoading={submitLoading}
      />

      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          title={showForm ? (editingId ? 'Editar Chofer' : 'Nuevo Chofer') : 'Choferes registrados'}
          description={showForm ? 'Completa los datos personales del chofer.' : 'Lista completa de choferes habilitados para realizar viajes.'}
        />

        {canWriteDrivers && (
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
              {showForm ? 'Volver al Listado' : 'Nuevo Chofer'}
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
                label="Nombre y Apellido"
                placeholder="Ej: Juan Pérez"
                icon={User}
                {...register('name')}
                error={errors.name?.message}
              />
              <Input
                label="DNI"
                placeholder="Ej: 12345678"
                icon={FileText}
                {...register('dni')}
                error={errors.dni?.message}
              />
              <Input
                label="Teléfono"
                placeholder="Ej: 3446112233"
                icon={Phone}
                {...register('phone')}
                error={errors.phone?.message}
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
          data={drivers}
          isLoading={loading}
          onRowClick={canWriteDrivers ? handleEdit : undefined}
        />
      )}
    </div>
  );
};

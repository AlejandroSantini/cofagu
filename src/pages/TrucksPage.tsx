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
import { Plus, ChevronLeft, Save, Trash2, TruckIcon, FileText, Scale, Building2 } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid }
  } = useForm<TruckFormValues>({
    resolver: zodResolver(truckSchema),
    mode: 'onChange'
  });

  const fetchData = async () => {
    try {
      const [trkRes, crrRes] = await Promise.all([
        truckService.getTrucks(),
        carrierService.getCarriers()
      ]);

      if (trkRes.data.success) setTrucks(trkRes.data.data);
      if (crrRes.data.success) setCarriers(crrRes.data.data);
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
          carrierService.getCarriers()
        ]);
        if (active) {
          if (trkRes.data.success) setTrucks(trkRes.data.data);
          if (crrRes.data.success) setCarriers(crrRes.data.data);
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
  }, []);

  const handleEdit = (truck: Truck) => {
    setEditingId(truck.id);
    setValue('plate', truck.plate);
    setValue('type', truck.type);
    setValue('capacity', String(truck.capacity));
    setValue('carrierId', String(truck.carrierId));
    setShowForm(true);
  };

  const onSubmit = async (data: TruckFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload = {
        ...data,
        capacity: Number(data.capacity),
        carrierId: Number(data.carrierId)
      };
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
      carrierId: ''
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
    {
      header: 'Transportista',
      render: (t: Truck) => (
        <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-semibold">
          <Building2 size={14} className="opacity-60" />
          {t.carrier?.name || 'Desconocido'}
        </span>
      )
    },
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
      </div>

      <ErrorMessage message={error} className="mb-6" />

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Patente / Dominio"
                placeholder="Ej: ABC 123 o AD 123 CD"
                icon={FileText}
                {...register('plate')}
                error={errors.plate?.message}
                className="uppercase"
              />
              <Input
                label="Tipo de Camión / Acoplado"
                placeholder="Ej: Semirremolque / Chasis"
                icon={TruckIcon}
                {...register('type')}
                error={errors.type?.message}
              />
              <Input
                label="Capacidad de Carga (kg)"
                type="number"
                placeholder="Ej: 30000"
                icon={Scale}
                {...register('capacity')}
                error={errors.capacity?.message}
              />
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
          onRowClick={handleEdit}
        />
      )}
    </div>
  );
};

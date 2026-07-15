import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { carrierSchema, type CarrierFormValues } from '../schemas/carrier.schema';
import { carrierService } from '../api/services';
import { type Carrier } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../hooks/useConfirm';
import { Plus, ChevronLeft, Save, Trash2, Building, Mail, Phone, ShieldAlert } from 'lucide-react';

export const CarriersPage: React.FC = () => {
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
  } = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    mode: 'onChange'
  });

  const fetchCarriers = async () => {
    try {
      const res = await carrierService.getCarriers();
      if (res.data.success) {
        setCarriers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de transportistas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await carrierService.getCarriers();
        if (active && res.data.success) {
          setCarriers(res.data.data);
        }
      } catch (err) {
        console.error(err);
        if (active) setError('Error al cargar la lista de transportistas.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleEdit = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setValue('name', carrier.name);
    setValue('cuit', carrier.cuit);
    setValue('contactEmail', carrier.contactEmail);
    setValue('contactPhone', carrier.contactPhone);
    setShowForm(true);
  };

  const onSubmit = async (data: CarrierFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const res = editingId
        ? await carrierService.updateCarrier(editingId, data)
        : await carrierService.createCarrier(data);

      if (res.data.success) {
        showToast(editingId ? 'Transportista actualizado con éxito' : 'Transportista creado con éxito');
        handleBack();
        setLoading(true);
        fetchCarriers();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el transportista.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setSubmitLoading(true);
    try {
      const res = await carrierService.deleteCarrier(delId);
      if (res.data.success) {
        showToast('Transportista eliminado con éxito');
        confirmDelete();
        setLoading(true);
        fetchCarriers();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar el transportista.'));
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
      cuit: '',
      contactEmail: '',
      contactPhone: ''
    });
    setError('');
  };

  const columns = [
    {
      header: 'Nombre / Razón Social',
      render: (c: Carrier) => (
        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
      )
    },
    {
      header: 'CUIT',
      render: (c: Carrier) => (
        <span className="font-mono text-sm text-slate-600 dark:text-zinc-400">{c.cuit}</span>
      )
    },
    {
      header: 'Email de Contacto',
      render: (c: Carrier) => (
        <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
          <Mail size={14} className="opacity-60" />
          {c.contactEmail}
        </span>
      )
    },
    {
      header: 'Teléfono',
      render: (c: Carrier) => (
        <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
          <Phone size={14} className="opacity-60" />
          {c.contactPhone}
        </span>
      )
    },
    {
      header: 'Acciones',
      className: 'w-24 text-right',
      render: (c: Carrier) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            iconClassName="text-rose-500"
            onClick={() => askDelete(c.id)}
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
        title="Eliminar Transportista"
        description="¿Estás seguro de que deseas eliminar este transportista? Se desactivará de forma permanente."
        type="danger"
        confirmText="Eliminar"
        isLoading={submitLoading}
      />

      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          title={showForm ? (editingId ? 'Editar Transportista' : 'Nuevo Transportista') : 'Empresas Transportistas'}
          description={showForm ? 'Completa los datos de la empresa transportista.' : 'Administra las empresas asociadas para la asignación de cargas.'}
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
            {showForm ? 'Volver al Listado' : 'Nuevo Transportista'}
          </Button>
        </div>
      </div>

      <ErrorMessage message={error} className="mb-6" />

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre / Razón Social"
                placeholder="Ej: Transportes del Norte S.A."
                icon={Building}
                {...register('name')}
                error={errors.name?.message}
              />
              <Input
                label="CUIT"
                placeholder="Ej: 30-12345678-9"
                icon={ShieldAlert}
                {...register('cuit')}
                error={errors.cuit?.message}
              />
              <Input
                label="Email de Contacto"
                type="email"
                placeholder="Ej: contacto@transporte.com"
                icon={Mail}
                {...register('contactEmail')}
                error={errors.contactEmail?.message}
              />
              <Input
                label="Teléfono de Contacto"
                placeholder="Ej: 3446662836"
                icon={Phone}
                {...register('contactPhone')}
                error={errors.contactPhone?.message}
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
          data={carriers}
          isLoading={loading}
          onRowClick={handleEdit}
        />
      )}
    </div>
  );
};

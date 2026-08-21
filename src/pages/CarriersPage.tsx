import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { carrierSchema, type CarrierFormValues } from '../schemas/carrier.schema';
import { carrierService } from '../api/services';

import { type Carrier } from '../types';

import { getErrorMessage } from '../api/errorUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/ui/Toast';
import { useConfirm } from '../hooks/useConfirm';
import { useAuthStore } from '../store/useAuthStore';
import {
  Plus, ChevronLeft, Save, Building,
  Mail, Phone, ShieldAlert, Key, Copy, Check, Info
} from 'lucide-react';
import CarrierList from '../components/carriers/CarrierList';
import CarrierDetails from '../components/carriers/CarrierDetails';

export const CarriersPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Credentials modal state
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Selected carrier detail state
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [carrierDetailsLoading, setCarrierDetailsLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'DRIVERS' | 'TRUCKS' | 'USERS' | 'CANCELLATIONS'>('DRIVERS');
  const [cancelledApps, setCancelledApps] = useState<any[]>([]);
  const [cancelledLoading, setCancelledLoading] = useState(false);

  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delId, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number>();

  const canWrite = useAuthStore((state) => state.canWrite());
  const isLogistics = useAuthStore((state) => state.isLogistics());


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid }
  } = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      cuit: '',
      contactEmail: '',
      contactPhone: '',
      password: ''
    }
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
    return () => { active = false; };
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchSelectedCarrier = async () => {
      if (!id) {
        if (active) setSelectedCarrier(null);
        return;
      }
      setCarrierDetailsLoading(true);
      setCancelledLoading(true);
      try {
        const [res, historyRes] = await Promise.allSettled([
          carrierService.getCarrier(Number(id)),
          carrierService.getCarrierHistory(Number(id))
        ]);

        if (active && res.status === 'fulfilled' && res.value.data.success) {
          setSelectedCarrier(res.value.data.data);
        }
        if (active && historyRes.status === 'fulfilled' && historyRes.value.data.success) {
          setCancelledApps(historyRes.value.data.data || []);
        }
      } catch (err) {
        console.error(err);
        if (active) showToast('Error al cargar detalles del transportista.', 'error');
      } finally {
        if (active) {
          setCarrierDetailsLoading(false);
          setCancelledLoading(false);
        }
      }
    };
    fetchSelectedCarrier();
    return () => { active = false; };
  }, [id]);

  const handleRowClick = async (carrier: Carrier) => {
    navigate(`/carriers/${carrier.id}`);
  };


  const handleEdit = (carrier: Carrier) => {
    navigate('/carriers');
    setEditingId(carrier.id);
    setValue('name', carrier.name);
    setValue('cuit', carrier.cuit);
    setValue('contactEmail', carrier.contactEmail || '');
    setValue('contactPhone', carrier.contactPhone);
    setValue('password', '');
    setShowForm(true);
  };

  const onSubmit = async (data: CarrierFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const payload: any = {
        name: data.name,
        cuit: data.cuit,
        contactPhone: data.contactPhone,
      };

      if (data.contactEmail && data.contactEmail.trim() !== '') {
        payload.contactEmail = data.contactEmail.trim();
      }

      if (data.password && data.password.trim() !== '') {
        payload.password = data.password.trim();
      }

      const res = editingId
        ? await carrierService.updateCarrier(editingId, payload)
        : await carrierService.createCarrier(payload);


      if (res.data.success) {
        showToast(editingId ? 'Transportista actualizado con éxito' : 'Transportista creado con éxito');
        const createdCarrier = res.data.data;
        handleBack();
        setLoading(true);
        await fetchCarriers();
        if (!editingId && !isLogistics && createdCarrier.user) {
          setCredentialsModal({
            email: createdCarrier.user.email,
            password: data.password || '12345'
          });
        }
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
        navigate('/carriers');
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
      contactPhone: '',
      password: ''
    });
    setError('');
  };

  const handleCopyCredentials = () => {
    if (!credentialsModal) return;
    const text = `Email: ${credentialsModal.email}\nContraseña: ${credentialsModal.password || '12345'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      {/* Delete confirmation modal */}
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

      {/* Credentials modal */}
      <Modal
        isOpen={credentialsModal !== null}
        onClose={() => setCredentialsModal(null)}
        title="🔑 Credenciales de Acceso Creadas"
        confirmText="Copiar y Cerrar"
        onConfirm={() => { handleCopyCredentials(); setCredentialsModal(null); }}
      >
        {credentialsModal && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Se ha creado automáticamente un usuario transportista (`CARRIER`) para el acceso a la plataforma. Comparte estos datos con la empresa:
            </p>
            <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Correo Electrónico</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{credentialsModal.email}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Contraseña</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-mono">{credentialsModal.password || '12345'}</span>
              </div>
            </div>
            <div className="flex gap-2 p-3 bg-amber-500/10 rounded-xl text-amber-600 text-xs items-start">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                El transportista tiene la bandera `mustChangePassword` activa, por lo que el sistema le obligará a actualizar su contraseña inmediatamente después de su primer inicio de sesión.
              </span>
            </div>
            <Button variant="outline" onClick={handleCopyCredentials} className="w-full flex items-center justify-center gap-2">
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar al portapapeles'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Header and action button */}
      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          title={showForm ? (editingId ? 'Editar Transportista' : 'Nuevo Transportista') : 'Empresas Transportistas'}
          description={showForm ? 'Completa los datos de la empresa transportista.' : 'Administra las empresas asociadas para la asignación de cargas.'}
        />
        {canWrite && (
          <div>
            <Button
              variant={showForm ? 'outline' : 'primary'}
              onClick={() => { if (showForm) handleBack(); else setShowForm(true); }}
              icon={showForm ? ChevronLeft : Plus}
              className="w-full md:w-fit px-8"
            >
              {showForm ? 'Volver al Listado' : 'Nuevo Transportista'}
            </Button>
          </div>
        )}
      </div>

      <ErrorMessage message={error} className="mb-6" />

      {showForm ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nombre / Razón Social" placeholder="Ej: Transportes del Norte S.A." icon={Building} {...register('name')} error={errors.name?.message} />
              <Input label="CUIT" placeholder="Ej: 30-12345678-9" icon={ShieldAlert} {...register('cuit')} error={errors.cuit?.message} />
              
              {!isLogistics && (
                <Input label="Email de Contacto (Usuario)" type="email" placeholder="Ej: contacto@transporte.com" icon={Mail} {...register('contactEmail')} error={errors.contactEmail?.message} />
              )}
              
              <Input label="Teléfono de Contacto" placeholder="Ej: 3446662836" icon={Phone} {...register('contactPhone')} error={errors.contactPhone?.message} />
              
              {!editingId && !isLogistics && (
                <Input label="Contraseña de Acceso (Opcional)" type="password" placeholder="Por defecto: 12345" icon={Key} {...register('password')} error={errors.password?.message} />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button type="button" variant="secondary" onClick={handleBack}>Cancelar</Button>
              <Button type="submit" isLoading={submitLoading} disabled={!isValid} icon={Save}>Guardar</Button>
            </div>
          </form>
        </div>

      ) : selectedCarrier ? (
        <CarrierDetails
          carrier={selectedCarrier}
          loading={carrierDetailsLoading}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          onEdit={handleEdit}
          onBack={() => navigate('/carriers')}
          canWrite={canWrite}
          onCopyCredentials={handleCopyCredentials}
          credentialsModal={credentialsModal}
          copied={copied}
          cancelledApps={cancelledApps}
          cancelledLoading={cancelledLoading}
        />

      ) : (
        <CarrierList
          carriers={carriers}
          loading={loading}
          onRowClick={handleRowClick}
          canWrite={canWrite}
          onDeleteConfirm={askDelete}
        />
      )}
    </div>
  );
};

export default CarriersPage;

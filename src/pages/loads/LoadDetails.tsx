import React, { useState } from 'react';
import { type Load, type Driver, type Truck, type User as UserType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

import { 
  Trash2, Calendar, DollarSign, Send, 
  CheckCircle, AlertTriangle, User, Truck as TruckIcon, Building, Loader2, Scale, Layers, Clock, XCircle
} from 'lucide-react';

import { api } from '../../api/axios';

const SecureImagePreview: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className = "max-h-48 rounded-lg object-contain" }) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!src || typeof src !== 'string' || src.startsWith('data:') || src.startsWith('blob:')) {
      return;
    }

    let active = true;
    let currentBlobUrl = '';
    const fetchSecureImage = async () => {
      setLoading(true);
      try {
        const response = await api.get(src, { responseType: 'blob' });
        if (active && response.data) {
          currentBlobUrl = URL.createObjectURL(response.data);
          setBlobUrl(currentBlobUrl);
        }
      } catch (error) {
        console.error('Error fetching secure image preview:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSecureImage();

    return () => {
      active = false;
      if (currentBlobUrl) {
        try {
          URL.revokeObjectURL(currentBlobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [src]);

  const displayUrl = (src && typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'))) ? src : blobUrl;

  if (loading) {
    return <Loader2 className="animate-spin text-slate-400" size={24} />;
  }

  if (!displayUrl) {
    return <span className="text-xs text-rose-500 font-bold">Error al cargar vista previa</span>;
  }

  return (
    <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="cursor-zoom-in block">
      <img src={displayUrl} alt={alt || "Adjunto"} className={className} />
    </a>
  );
};

interface LoadDetailsProps {
  load: Load;
  user: UserType | null;
  onCancelLoad: (id: number) => void;
  onApply: (notes: string, driverId: number, truckId: number) => Promise<boolean>;
  onStatusChange: (newStatus: string) => void;
  onReportContingency: (description: string, reportedBy: string) => Promise<boolean>;
  onConfirmDepartureByApp?: (appId: number, ctg: string, loadedWeight: number) => Promise<boolean>;
  onCompleteLoadByApp?: (appId: number, data: { unloadedWeight: number; waybillUrl?: string; fuelConsumption?: number; mileage?: number }) => Promise<boolean>;
  onCompleteLoad: (data: { 
    unloadedWeight: number; 
    fuelConsumption?: number; 
    mileage?: number;
    arrivedTrucks?: number;
    notes?: string;
    invoiceUrl?: string;
    waybillUrl?: string;
  }) => Promise<boolean>;
  onUpdateLoad?: (id: number, data: Partial<Load>) => Promise<boolean>;
  
  // Assignment resources props
  selectedAppId: number | null;
  setSelectedAppId: (id: number | null) => void;
  setSelectedCarrierId: (id: number | null) => void;
  carrierDrivers: Driver[];
  carrierTrucks: Truck[];
  onAssign: () => void;
  onAssignResources?: (driverId: number, truckId: number) => Promise<void>;
  submitLoading: boolean;
}

export const LoadDetails: React.FC<LoadDetailsProps> = ({
  load,
  user,
  onCancelLoad,
  onApply,
  onStatusChange,
  onReportContingency,
  onConfirmDepartureByApp,
  onCompleteLoadByApp,
  onCompleteLoad,
  onUpdateLoad,

  
  selectedAppId,
  setSelectedAppId,
  setSelectedCarrierId,
  carrierDrivers,
  carrierTrucks,
  onAssign,
  submitLoading
}) => {

  // Local modal states
  const [showPostulateModal, setShowPostulateModal] = useState(false);
  const [showContingencyModal, setShowContingencyModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Local input states
  const [postulateNotes, setPostulateNotes] = useState('');
  const [postulateDriverId, setPostulateDriverId] = useState('');
  const [postulateTruckId, setPostulateTruckId] = useState('');
  const [contingencyDesc, setContingencyDesc] = useState('');
  const [contingencyReporter, setContingencyReporter] = useState('');
  const [arrivedTrucksInput, setArrivedTrucksInput] = useState(load.maxTrucks || 1);
  const [completionNotes, setCompletionNotes] = useState('');
  const [localSubmitLoading, setLocalSubmitLoading] = useState(false);

  const [showPlantModal, setShowPlantModal] = useState(false);
  const [plantCtg, setPlantCtg] = useState('');
  const [plantLoadedWeight, setPlantLoadedWeight] = useState('');
  const [showDelayedModal, setShowDelayedModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);




  const acceptedCount = load.applications?.filter(a => a.status === 'ACCEPTED').length || 0;
  const maxCapacity = load.maxTrucks || 1;
  const selectedApp = load.applications?.find(a => a.id === selectedAppId);

  const canUserWrite = user?.role === 'ADMIN' || user?.role === 'OPERATOR';
  const isCarrier = user?.role === 'CARRIER';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'EMPLOYEE' || user?.role === 'PLAYERO' || user?.role === 'GAS_STATION';
  const hasApplied = load.applications?.some(app => app.carrierId === user?.carrierId);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'warning';
      case 'ASSIGNED': return 'primary';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const isTruckInsuranceValid = (t: Truck) => {
    // Si viene la propiedad 'habilitado' en el camión, se evalúa directamente
    if (typeof t.habilitado === 'boolean') {
      return t.habilitado;
    }
    // De lo contrario, se verifica que el estado del seguro de carga esté APROBADO
    return t.cargoInsuranceStatus === 'APPROVED';
  };



  const handleLocalApply = async () => {
    if (!postulateDriverId || !postulateTruckId) return;
    const selectedTruck = carrierTrucks.find(t => String(t.id) === postulateTruckId);
    if (selectedTruck && !isTruckInsuranceValid(selectedTruck)) {
      alert("El seguro de carga del camión seleccionado está vencido o incompleto. Debe actualizar los datos del camión para poder viajar.");
      return;
    }
    setLocalSubmitLoading(true);
    const success = await onApply(postulateNotes, Number(postulateDriverId), Number(postulateTruckId));
    setLocalSubmitLoading(false);
    if (success) {
      setShowPostulateModal(false);
      setPostulateNotes('');
      setPostulateDriverId('');
      setPostulateTruckId('');
    }
  };

  const [activeAppId, setActiveAppId] = useState<number | null>(null);

  const handleLocalPlantSave = async () => {
    if (!plantCtg || !plantLoadedWeight) return;
    setLocalSubmitLoading(true);
    let success = false;
    if (activeAppId && onConfirmDepartureByApp) {
      success = await onConfirmDepartureByApp(activeAppId, plantCtg, Number(plantLoadedWeight));
    } else if (onUpdateLoad) {
      success = await onUpdateLoad(load.id, {
        ctg: plantCtg,
        loadedWeight: Number(plantLoadedWeight),
        status: 'IN_PROGRESS'
      });
    }
    setLocalSubmitLoading(false);
    if (success) {
      setShowPlantModal(false);
      setActiveAppId(null);
      setPlantCtg('');
      setPlantLoadedWeight('');
    }
  };

  const handleLocalReportContingency = async () => {
    setLocalSubmitLoading(true);
    const success = await onReportContingency(contingencyDesc, contingencyReporter);
    setLocalSubmitLoading(false);
    if (success) {
      setShowContingencyModal(false);
      setContingencyDesc('');
      setContingencyReporter('');
    }
  };

  const handleLocalComplete = async () => {
    setLocalSubmitLoading(true);
    let success = false;
    if (activeAppId && onCompleteLoadByApp) {
      success = await onCompleteLoadByApp(activeAppId, {
        unloadedWeight: 1,
      });
    } else {
      const data = {
        unloadedWeight: 1,
        arrivedTrucks: arrivedTrucksInput ? Number(arrivedTrucksInput) : undefined,
        notes: completionNotes || undefined,
      };
      success = await onCompleteLoad(data);
    }

    setLocalSubmitLoading(false);
    if (success) {
      setShowCompletionModal(false);
      setActiveAppId(null);
      setArrivedTrucksInput(load.maxTrucks || 1);
      setCompletionNotes('');
    }
  };



  return (
    <div className="space-y-6">
      {/* Report Delayed Modal */}
      <Modal
        isOpen={showDelayedModal}
        onClose={() => setShowDelayedModal(false)}
        onConfirm={async () => {
          setLocalSubmitLoading(true);
          await onStatusChange('DELAYED');
          setLocalSubmitLoading(false);
          setShowDelayedModal(false);
        }}
        title="Reportar Viaje Demorado"
        description="Se enviará un aviso automático por WhatsApp al coordinador con los detalles del viaje (CTG, patente, chofer, cereal). ¿Deseas confirmar?"
        type="danger"
        confirmText="Confirmar Reporte"

        isLoading={localSubmitLoading}
      />

      {/* Report Rejected Modal */}
      <Modal
        isOpen={showRejectedModal}
        onClose={() => setShowRejectedModal(false)}
        onConfirm={async () => {
          setLocalSubmitLoading(true);
          await onStatusChange('REJECTED');
          setLocalSubmitLoading(false);
          setShowRejectedModal(false);
        }}
        title="Reportar Viaje Rechazado"
        description="Se enviará un aviso automático por WhatsApp al coordinador con los detalles del viaje (CTG, patente, chofer, cereal) notificando el rechazo en destino. ¿Deseas confirmar?"
        type="danger"
        confirmText="Confirmar Rechazo"
        isLoading={localSubmitLoading}
      />

      {/* Postulate Modal */}

      <Modal
        isOpen={showPostulateModal}
        onClose={() => setShowPostulateModal(false)}
        title="Postularse a Viaje"
        confirmText="Confirmar"
        onConfirm={handleLocalApply}
        isLoading={localSubmitLoading}
        isConfirmDisabled={!postulateDriverId || !postulateTruckId}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500">
            ¿Deseas postularte a esta solicitud de carga? Por favor selecciona el chofer y camión que realizarán el viaje:
          </p>
          <Select
            label="Chofer Habilitado"
            icon={User}
            options={carrierDrivers.map((d) => {
              const isSuspended = d.isSuspended || (d.suspendedUntil ? new Date(d.suspendedUntil) > new Date() : false);
              const suffix = isSuspended 
                ? ` - Suspendido hasta ${d.suspendedUntil ? new Date(d.suspendedUntil).toLocaleDateString('es-AR') : 'N/D'}` 
                : '';
              return {
                value: String(d.id),
                label: `${d.name} (DNI: ${d.dni})${suffix}`,
                disabled: isSuspended
              };
            })}
            value={postulateDriverId}
            onChange={(e) => setPostulateDriverId(e.target.value)}
          />
          <Select
            label="Camión Flota"
            icon={TruckIcon}
            options={carrierTrucks.map((t) => {
              const plateText = t.chassisPlate || t.plate || 'S/P';
              const validInsurance = isTruckInsuranceValid(t);
              const isSuspended = t.isSuspended || (t.suspendedUntil ? new Date(t.suspendedUntil) > new Date() : false);
              const expired = t.cargoInsuranceExpiration ? new Date(t.cargoInsuranceExpiration) < new Date() : true;
              
              let suffix = '';
              if (isSuspended) {
                suffix = ` - Suspendido hasta ${t.suspendedUntil ? new Date(t.suspendedUntil).toLocaleDateString('es-AR') : 'N/D'}`;
              } else if (!validInsurance) {
                suffix = expired ? ' - Seguro Carga Vencido (Bloqueado)' : ' - Seguro Carga Incompleto (Bloqueado)';
              }

              const disabled = isSuspended || !validInsurance;
              return {
                value: String(t.id),
                label: `${plateText} (${t.type})${suffix}`,
                disabled
              };
            })}
            value={postulateTruckId}
            onChange={(e) => setPostulateTruckId(e.target.value)}
          />

          <Input
            label="Comentarios / Notas (Opcional)"
            placeholder="Ej: Contamos con flota disponible para salida inmediata."
            value={postulateNotes}
            onChange={(e) => setPostulateNotes(e.target.value)}
            className="py-2.5"
          />
        </div>
      </Modal>

      {/* Contingency Modal */}
      <Modal
        isOpen={showContingencyModal}
        onClose={() => setShowContingencyModal(false)}
        title="Reportar Contingencia"
        confirmText="Enviar Novedad"
        onConfirm={handleLocalReportContingency}
        isLoading={localSubmitLoading}
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Descripción del Incidente"
            placeholder="Ej: Retraso por control policial en ruta 14."
            value={contingencyDesc}
            onChange={(e) => setContingencyDesc(e.target.value)}
            required
            className="py-2.5"
          />
          <Input
            label="Reportado Por (Nombre)"
            placeholder="Ej: Pedro Chofer"
            value={contingencyReporter}
            onChange={(e) => setContingencyReporter(e.target.value)}
            className="py-2.5"
          />
        </div>
      </Modal>

      {/* Balancera / Plant Modal */}
      <Modal
        isOpen={showPlantModal}
        onClose={() => setShowPlantModal(false)}
        title="Registrar Pesaje de Carga (Planta)"
        confirmText="Guardar Datos"
        onConfirm={handleLocalPlantSave}
        isLoading={localSubmitLoading}
        isConfirmDisabled={!plantCtg || !plantLoadedWeight}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500">
            Ingrese el Código de Carta de Porte (CTG) y el pesaje cargado en báscula:
          </p>
          <Input
            label="Código CTG / Carta de Porte *"
            placeholder="Ej: 12345XYZ"
            value={plantCtg}
            onChange={(e) => setPlantCtg(e.target.value)}
            className="py-2.5"
          />
          <Input
            label="Kilos Cargados *"
            type="number"
            step="any"
            placeholder="Ej: 30000"
            value={plantLoadedWeight}
            onChange={(e) => setPlantLoadedWeight(e.target.value)}
            className="py-2.5"
          />
        </div>
      </Modal>

      {/* Completion Modal - simple confirmation only */}
      <Modal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setActiveAppId(null);
        }}
        title="Finalizar Viaje"
        confirmText="Confirmar Llegada"
        onConfirm={handleLocalComplete}
        isLoading={localSubmitLoading}
        type="success"
        description={(() => {
          const activeTrip = (load.applications || []).find(a => a.id === activeAppId);
          const plate = activeTrip?.truck?.chassisPlate || activeTrip?.truck?.plate || load.truck?.plate;
          const driver = activeTrip?.driver?.name || load.driver?.name;
          
          if (plate || driver) {
            return `¿Confirmás la llegada a destino del camión ${plate ? `[${plate}]` : ''} ${driver ? `(Chofer: ${driver})` : ''}? Esta acción marcará su viaje como finalizado.`;
          }
          return "¿Confirmás que el camión llegó al destino y completó la descarga? Esta acción marcará el viaje como finalizado.";
        })()}
      />


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Detalles de Ruta</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{load.origin} → {load.destination}</h2>
              </div>
              <Badge variant={getStatusBadgeVariant(load.status)}>
                {load.status === 'PUBLISHED' ? 'DISPONIBLE' : 
                 load.status === 'ASSIGNED' ? 'ASIGNADO' : 
                 load.status === 'IN_PROGRESS' ? 'EN VIAJE' : 
                 load.status === 'COMPLETED' ? 'COMPLETADO' : 'CANCELADO'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Fecha de Carga</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {new Date(load.loadingDate || load.date).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Fecha de Cupo</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {load.quotaDate ? new Date(load.quotaDate).toLocaleDateString('es-AR') : 'No especificada'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Horario de Carga</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {load.loadingTimeStart && load.loadingTimeEnd 
                      ? `${load.loadingTimeStart} - ${load.loadingTimeEnd} hs` 
                      : 'No especificado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Building size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Cereal / Producto</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {load.cereal || 'No especificado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Tarifa</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    ${Number(load.rate).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <TruckIcon size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Cupos Disponibles</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {load.cuposPendientes !== undefined 
                      ? `${load.cuposPendientes} libres` 
                      : `${load.maxTrucks ? load.maxTrucks - acceptedCount : 1} libres`}
                  </span>
                </div>
              </div>

              {/* Progress metric for arrived/completed trucks */}
              {acceptedCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">Camiones Arribados</span>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                      {load.applications?.filter(a => a.status === 'ACCEPTED' && (a.tripStatus === 'COMPLETED' || load.status === 'COMPLETED')).length || 0} / {acceptedCount} en destino
                    </span>
                  </div>
                </div>
              )}


              {load.ctg && (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <Send size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">Código CTG</span>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                      {load.ctg}
                    </span>
                  </div>
                </div>
              )}

              {load.loadedWeight != null && (
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <Scale size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">Kilos Cargados</span>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                      {Number(load.loadedWeight).toLocaleString('es-AR')} kg
                    </span>
                  </div>
                </div>
              )}
            </div>

            {load.notes && (
              <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Notas Adicionales</span>
                <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium">{load.notes}</p>
              </div>
            )}

            {load.targetGroups && load.targetGroups.length > 0 && (
              <div className="bg-emerald-500/5 dark:bg-zinc-800/40 p-4 rounded-xl border border-emerald-500/20 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    Publicación Dirigida a Grupos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {load.targetGroups.map((tg, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-750 text-xs">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {tg.group?.name || `Grupo ID: ${tg.groupId}`}
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ${Number(tg.rate).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {load.status === 'COMPLETED' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 space-y-4">
                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle size={20} />
                  Datos de Finalización de Viaje
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  {load.unloadedWeight != null && Number(load.unloadedWeight) > 0 && (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Kilos Descargados</span>
                      <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                        {Number(load.unloadedWeight).toLocaleString('es-AR')} kg
                      </span>
                    </div>
                  )}
                  {load.fuelConsumption ? (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Consumo de Combustible</span>
                      <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                        {load.fuelConsumption} Lts
                      </span>
                    </div>
                  ) : null}
                  {load.mileage ? (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Kilometraje Recorrido</span>
                      <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                        {load.mileage} km
                      </span>
                    </div>
                  ) : null}
                  {(!load.unloadedWeight || Number(load.unloadedWeight) === 0) && !load.fuelConsumption && !load.mileage && (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800 col-span-full">
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Todos los camiones arribaron a destino correctamente. Viaje finalizado.
                      </span>
                    </div>
                  )}

                </div>

                {(load.invoiceUrl || load.waybillUrl) && (
                  <div className="pt-4 border-t border-emerald-100/50 dark:border-emerald-900/20 space-y-4">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Documentación Adjunta</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {load.invoiceUrl && (
                        <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800">
                          <span className="text-xs font-bold text-slate-500">Factura / Remito</span>
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-center p-2">
                            <SecureImagePreview src={load.invoiceUrl} />
                          </div>
                        </div>
                      )}
                      {load.waybillUrl && (
                        <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800">
                          <span className="text-xs font-bold text-slate-500">Carta de Porte</span>
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-center p-2">
                            <SecureImagePreview src={load.waybillUrl} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions Triggers */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
              {canUserWrite && load.status !== 'CANCELLED' && load.status !== 'COMPLETED' && (
                <Button variant="danger" icon={Trash2} onClick={() => onCancelLoad(load.id)}>
                  Cancelar Carga
                </Button>
              )}
              {isStaff && (load.status === 'ASSIGNED' || load.status === 'IN_PROGRESS') && (
                <Button 
                  variant="primary" 
                  icon={CheckCircle} 
                  onClick={() => {
                    setPlantCtg(load.ctg || '');
                    setPlantLoadedWeight(load.loadedWeight ? String(load.loadedWeight) : '');
                    setShowPlantModal(true);
                  }}
                >
                  Registrar Pesaje de Carga (Balancera)
                </Button>
              )}
              {isCarrier && (
                <>
                  {load.status === 'PUBLISHED' && !hasApplied && (
                    <Button variant="primary" icon={Send} onClick={() => setShowPostulateModal(true)}>
                      Postularse a este viaje
                    </Button>
                  )}
                  {load.status === 'ASSIGNED' && (
                    <Button variant="primary" icon={Send} onClick={() => onStatusChange('IN_PROGRESS')}>
                      Iniciar Traslado
                    </Button>
                  )}
                </>
              )}


              {(isCarrier || canUserWrite) && load.status === 'IN_PROGRESS' && (
                <>
                  <Button 
                    variant="outline" 
                    icon={AlertTriangle} 
                    className="border-amber-500/30 text-amber-600 hover:bg-amber-50" 
                    onClick={() => setShowContingencyModal(true)}
                  >
                    Reportar Contingencia
                  </Button>
                  
                  {isCarrier && (
                    <>
                      <Button
                        variant="outline"
                        icon={Clock}
                        className="border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold"
                        onClick={() => setShowDelayedModal(true)}
                      >
                        Reportar Demorado
                      </Button>
                      <Button
                        variant="outline"
                        icon={XCircle}
                        className="border-rose-500/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
                        onClick={() => setShowRejectedModal(true)}
                      >
                        Reportar Rechazado
                      </Button>


                    </>
                  )}
                </>
              )}
            </div>

            {/* Missing kilos warning & admin adjustment button */}
            {load.unloadedWeight != null && load.loadedWeight != null && Number(load.unloadedWeight) < Number(load.loadedWeight) && (
              <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                    <span>Diferencia de Kilos Faltantes Detectada en Destino: {(Number(load.loadedWeight) - Number(load.unloadedWeight)).toLocaleString('es-AR')} kg</span>
                  </div>
                  {load.differenceAdjusted ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">
                      Ajustado en Cta. Cte.
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/40 px-2.5 py-1 rounded-md">
                      Pendiente de Ajuste (Transportista Bloqueado)
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  El peso descargado ({Number(load.unloadedWeight).toLocaleString('es-AR')} kg) es menor al cargado en origen ({Number(load.loadedWeight).toLocaleString('es-AR')} kg).
                </p>

                {canUserWrite && !load.differenceAdjusted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                    onClick={async () => {
                      if (onUpdateLoad) {
                        const ok = await onUpdateLoad(load.id, { differenceAdjusted: true } as any);
                        if (ok) alert("Diferencia de kilos marcada como ajustada en cuenta corriente. Se desmarcó el bloqueo de postulación.");
                      }
                    }}
                  >
                    Marcar como Ajustado / Facturado en Cuenta Corriente
                  </Button>
                )}
              </div>
            )}

          </div>

          {/* Contingencies Timeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Historial de Contingencias y Novedades</h3>
            {!load.contingencies || load.contingencies.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No se registraron incidentes durante este traslado.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-100 dark:border-zinc-800 space-y-6">
                {load.contingencies.map((c) => (
                  <div key={c.id} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-amber-500 rounded-full border-4 border-white dark:border-zinc-900" />
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Reportado por: {c.reportedBy}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString('es-AR')}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Application Management (For Admin) or Assignment Information */}
        <div className="space-y-6">
          {isStaff ? (
            load.status === 'PUBLISHED' ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                  Postulaciones ({load.applications?.length || 0})
                </h3>
                
                {!load.applications || load.applications.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Esperando postulaciones de transportistas...</p>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {load.applications.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setSelectedCarrierId(app.carrierId);
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedAppId === app.id
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : 'border-slate-100 dark:border-zinc-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{app.carrier?.name || 'Transportista'}</span>
                          <Badge variant={app.status === 'PENDING' ? 'warning' : app.status === 'ACCEPTED' ? 'success' : 'error'}>
                            {app.status === 'PENDING' ? 'PENDIENTE' : app.status === 'ACCEPTED' ? 'APROBADA' : 'RECHAZADA'}
                          </Badge>
                        </div>
                        {app.notes && <p className="text-xs text-slate-500 mt-1 italic">"{app.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Assignment Form */}
                {selectedAppId && (
                  <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-4 animate-in fade-in duration-200">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Recursos Propuestos</span>
                    
                    {selectedApp?.status === 'ACCEPTED' ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-sm font-semibold">
                        Esta postulación ya ha sido aprobada y asignada.
                      </div>
                    ) : canUserWrite ? (
                      <>
                        {(() => {
                          const proposedTruck = selectedApp?.truck || carrierTrucks.find(t => t.id === selectedApp?.truckId);
                          const isProposedTruckInvalid = proposedTruck ? !isTruckInsuranceValid(proposedTruck) : false;

                          return (
                            <>
                              <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs font-semibold">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400 uppercase font-bold">Chofer:</span>
                                  <span className="text-slate-800 dark:text-zinc-200 font-bold">
                                    {carrierDrivers.find(d => d.id === selectedApp?.driverId)?.name || selectedApp?.driver?.name || `ID: ${selectedApp?.driverId || 'No asignado'}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400 uppercase font-bold">Camión:</span>
                                  <span className="text-slate-800 dark:text-zinc-200 font-bold">
                                    {carrierTrucks.find(t => t.id === selectedApp?.truckId)?.plate || selectedApp?.truck?.plate || `ID: ${selectedApp?.truckId || 'No asignado'}`}
                                  </span>
                                </div>
                              </div>

                              {isProposedTruckInvalid && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-semibold space-y-1">
                                  <p className="font-bold">⚠️ Seguro de camión propuesto inválido</p>
                                  <p className="opacity-90">El seguro del camión seleccionado está vencido o incompleto. El transportista debe actualizar los datos.</p>
                                </div>
                              )}

                              <Button
                                variant="primary"
                                icon={CheckCircle}
                                onClick={onAssign}
                                disabled={!selectedApp?.driverId || !selectedApp?.truckId || acceptedCount >= maxCapacity || isProposedTruckInvalid}
                                isLoading={submitLoading}
                                className="w-full"
                              >
                                {acceptedCount >= maxCapacity ? 'Cupo completo' : isProposedTruckInvalid ? 'Seguro Vencido / Incompleto' : 'Aprobar Postulación'}
                              </Button>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 rounded-xl text-xs italic">
                        Solo los administradores y operadores pueden aprobar postulaciones.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Assigned resources card (trips per truck manager)
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                  Recursos y Viajes Asignados ({load.applications?.filter(a => a.status === 'ACCEPTED').length || 0})
                </h3>
                
                {(() => {
                  const acceptedTrips = load.applications?.filter(a => a.status === 'ACCEPTED') || [];
                  if (acceptedTrips.length === 0) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <Building size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 block uppercase">Transportista</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.carrier?.name || 'Sin asignar'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <User size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 block uppercase">Chofer</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.driver?.name || 'Sin asignar'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <TruckIcon size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 block uppercase">Camión</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.truck?.plate || 'Sin asignar'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {acceptedTrips.map((trip) => {
                        const tripStatus = trip.tripStatus || (load.status === 'COMPLETED' ? 'COMPLETED' : load.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED');
                        const tripCtg = trip.ctg || load.ctg || '';
                        const loadedW = trip.loadedWeight ?? load.loadedWeight;
                        const unloadedW = trip.unloadedWeight ?? load.unloadedWeight;

                        return (
                          <div key={trip.id} className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-zinc-700 pb-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {trip.carrier?.name || load.carrier?.name || 'Transportista'}
                              </span>
                              <Badge variant={tripStatus === 'COMPLETED' ? 'success' : tripStatus === 'IN_PROGRESS' ? 'primary' : 'warning'}>
                                {tripStatus === 'COMPLETED' ? 'COMPLETADO' : tripStatus === 'IN_PROGRESS' ? 'EN VIAJE' : 'ASIGNADO'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">Camión</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                                  {trip.truck?.chassisPlate || trip.truck?.plate || load.truck?.plate || 'S/P'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">Chofer</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {trip.driver?.name || load.driver?.name || 'N/D'}
                                </span>
                              </div>
                            </div>

                            {tripCtg && (
                              <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800 flex justify-between">
                                <span>CTG: <strong>{tripCtg}</strong></span>
                                {loadedW != null && <span>Cargado: <strong>{Number(loadedW).toLocaleString('es-AR')} kg</strong></span>}
                              </div>
                            )}

                            {unloadedW != null && (
                              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Kilos Descargados: {Number(unloadedW).toLocaleString('es-AR')} kg
                              </div>
                            )}

                            {/* Actions for Balancero (EMPLOYEE/ADMIN) to confirm departure per trip */}
                            {isStaff && tripStatus === 'ASSIGNED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={CheckCircle}
                                className="w-full text-xs font-bold mt-2"
                                onClick={() => {
                                  setActiveAppId(trip.id);
                                  setPlantCtg(tripCtg);
                                  setPlantLoadedWeight(loadedW ? String(loadedW) : '');
                                  setShowPlantModal(true);
                                }}
                              >
                                Confirmar Salida de Balanza
                              </Button>
                            )}

                            {/* Solo el staff puede finalizar viajes desde esta vista global */}
                            {isStaff && tripStatus === 'IN_PROGRESS' && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={CheckCircle}
                                className="w-full text-xs font-bold mt-2"
                                onClick={() => {
                                  setActiveAppId(trip.id);
                                  setShowCompletionModal(true);
                                }}
                              >
                                Registrar Descarga en Destino
                              </Button>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )

          ) : (() => {
            // Carrier view: show all their accepted trips (one per truck)
            const myTrips = (load.applications || []).filter(app => app.carrierId === user?.carrierId);
            const myAcceptedTrips = myTrips.filter(app => app.status === 'ACCEPTED');
            const myPendingApp = myTrips.find(app => app.status === 'PENDING');

            return (
              <div className="space-y-6">

                {/* If no applications at all */}
                {myTrips.length === 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2 mb-4">Tu Postulación</h3>
                    <p className="text-sm text-slate-500 italic">Aún no te has postulado a esta carga.</p>
                  </div>
                )}

                {/* Pending application badge */}
                {myPendingApp && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">Tu Postulación</h3>
                    <div className="p-4 rounded-xl flex items-center justify-between border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Postulado — en revisión por el operador</span>
                      <Badge variant="warning">PENDIENTE</Badge>
                    </div>
                  </div>
                )}

                {/* Accepted trips: one card per truck */}
                {myAcceptedTrips.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                      Mis Camiones en este Viaje ({myAcceptedTrips.length})
                    </h3>
                    <div className="space-y-4">
                      {myAcceptedTrips.map((trip) => {
                        const effectiveTripStatus = trip.tripStatus || (load.status === 'COMPLETED' ? 'COMPLETED' : load.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED');
                        const isTripInProgress = effectiveTripStatus === 'IN_PROGRESS' || load.status === 'IN_PROGRESS';
                        const isTripCompleted = effectiveTripStatus === 'COMPLETED' || load.status === 'COMPLETED';
                        const tripCtg = trip.ctg || load.ctg || '';
                        const loadedW = trip.loadedWeight ?? load.loadedWeight;


                        return (
                          <div key={trip.id} className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-3">
                            {/* Header */}
                            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-zinc-700 pb-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {trip.driver?.name || load.driver?.name || 'Chofer Asignado'}
                              </span>
                              <Badge variant={isTripCompleted ? 'success' : isTripInProgress ? 'primary' : 'warning'}>
                                {isTripCompleted ? 'COMPLETADO' : isTripInProgress ? 'EN VIAJE' : 'ASIGNADO'}
                              </Badge>
                            </div>

                            {/* Truck info */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">Patente</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                                  {trip.truck?.chassisPlate || trip.truck?.plate || load.truck?.plate || 'S/P'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">Tipo</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {trip.truck?.type || load.truck?.type || 'N/D'}
                                </span>
                              </div>
                            </div>

                            {/* CTG & loaded weight (set by balancero) */}
                            {(!isTripCompleted && isTripInProgress) || tripCtg ? (
                              <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2.5 rounded border border-slate-200 dark:border-zinc-800 space-y-1">
                                {tripCtg && <div>CTG: <strong>{tripCtg}</strong></div>}
                                {loadedW != null && <div>Kilos cargados: <strong>{Number(loadedW).toLocaleString('es-AR')} kg</strong></div>}
                              </div>
                            ) : null}

                            {/* Unloaded weight if completed */}
                            {isTripCompleted && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                Llegada confirmada — en destino
                              </div>
                            )}

                            {/* Assigned: waiting for balancero */}
                            {!isTripInProgress && !isTripCompleted && (
                              <p className="text-xs text-slate-400 italic">Esperando confirmación de salida en balanza por el operador.</p>
                            )}

                            {/* In progress: carrier can finalize */}
                            {isTripInProgress && !isTripCompleted && isCarrier && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={CheckCircle}
                                className="w-full font-bold mt-1"
                                onClick={() => {
                                  setActiveAppId(trip.id);
                                  setShowCompletionModal(true);
                                }}
                              >
                                Confirmar Llegada a Destino
                              </Button>
                            )}
                          </div>
                        );

                      })}
                    </div>

                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

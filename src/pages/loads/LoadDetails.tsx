import React, { useState } from 'react';
import { type Load, type Driver, type Truck, type User as UserType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  Trash2, Calendar, DollarSign, Send, 
  CheckCircle, AlertTriangle, User, Truck as TruckIcon, Building 
} from 'lucide-react';

interface LoadDetailsProps {
  load: Load;
  user: UserType | null;
  onCancelLoad: (id: number) => void;
  onApply: (notes: string) => Promise<boolean>;
  onStatusChange: (newStatus: string) => void;
  onReportContingency: (description: string, reportedBy: string) => Promise<boolean>;
  onReportArrival: (arrivedTrucks: number, notes?: string) => Promise<boolean>;
  
  // Assignment resources props
  selectedAppId: number | null;
  setSelectedAppId: (id: number | null) => void;
  setSelectedCarrierId: (id: number | null) => void;
  carrierDrivers: Driver[];
  carrierTrucks: Truck[];
  assignDriverId: string;
  setAssignDriverId: (id: string) => void;
  assignTruckId: string;
  setAssignTruckId: (id: string) => void;
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
  onReportArrival,
  
  selectedAppId,
  setSelectedAppId,
  setSelectedCarrierId,
  carrierDrivers,
  carrierTrucks,
  assignDriverId,
  setAssignDriverId,
  assignTruckId,
  setAssignTruckId,
  onAssign,
  onAssignResources,
  submitLoading
}) => {
  // Local modal states
  const [showPostulateModal, setShowPostulateModal] = useState(false);
  const [showContingencyModal, setShowContingencyModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  
  // Local input states
  const [postulateNotes, setPostulateNotes] = useState('');
  const [contingencyDesc, setContingencyDesc] = useState('');
  const [contingencyReporter, setContingencyReporter] = useState('');
  const [arrivedTrucksInput, setArrivedTrucksInput] = useState(load.maxTrucks || 1);
  const [arrivalNotes, setArrivalNotes] = useState('');
  const [localSubmitLoading, setLocalSubmitLoading] = useState(false);

  // Carrier local resource assignment states
  const [localDriverId, setLocalDriverId] = useState(load.driverId ? String(load.driverId) : '');
  const [localTruckId, setLocalTruckId] = useState(load.truckId ? String(load.truckId) : '');

  // Keep local driver/truck state in sync with updated load properties
  React.useEffect(() => {
      setLocalDriverId(load.driverId ? String(load.driverId) : '');
      setLocalTruckId(load.truckId ? String(load.truckId) : '');
  }, [load.driverId, load.truckId]);

  const acceptedCount = load.applications?.filter(a => a.status === 'ACCEPTED').length || 0;
  const maxCapacity = load.maxTrucks || 1;
  const selectedApp = load.applications?.find(a => a.id === selectedAppId);

  const canUserWrite = user?.role === 'ADMIN' || user?.role === 'OPERATOR';
  const isCarrier = user?.role === 'CARRIER';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'EMPLOYEE';
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

  const handleLocalApply = async () => {
    setLocalSubmitLoading(true);
    const success = await onApply(postulateNotes);
    setLocalSubmitLoading(false);
    if (success) {
      setShowPostulateModal(false);
      setPostulateNotes('');
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

  const handleLocalReportArrival = async () => {
    setLocalSubmitLoading(true);
    const success = await onReportArrival(arrivedTrucksInput, arrivalNotes);
    setLocalSubmitLoading(false);
    if (success) {
      setShowArrivalModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Postulate Modal */}
      <Modal
        isOpen={showPostulateModal}
        onClose={() => setShowPostulateModal(false)}
        title="Postularse a Viaje"
        confirmText="Confirmar Postulación"
        onConfirm={handleLocalApply}
        isLoading={localSubmitLoading}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500">
            ¿Deseas postularte a esta solicitud de carga? Puedes añadir un comentario u observaciones opcionales:
          </p>
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

      {/* Arrival Modal */}
      <Modal
        isOpen={showArrivalModal}
        onClose={() => setShowArrivalModal(false)}
        title="Registrar Llegada a Planta"
        confirmText="Registrar Llegada"
        onConfirm={handleLocalReportArrival}
        isLoading={localSubmitLoading}
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Cantidad de Camiones Arribados"
            type="number"
            min={1}
            max={load.maxTrucks || 10}
            value={arrivedTrucksInput}
            onChange={(e) => setArrivedTrucksInput(Number(e.target.value))}
            required
            className="py-2.5"
          />
          <Input
            label="Observaciones"
            placeholder="Ej: Llegada de primer convoy sin novedades."
            value={arrivalNotes}
            onChange={(e) => setArrivalNotes(e.target.value)}
            className="py-2.5"
          />
        </div>
      </Modal>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Fecha de Carga</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {new Date(load.date).toLocaleDateString('es-AR')}
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
                  <span className="text-xs font-bold text-slate-400 block uppercase">Cupo Requerido</span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {acceptedCount} / {load.maxTrucks || 1} Camiones
                  </span>
                </div>
              </div>
            </div>

            {load.notes && (
              <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Notas Adicionales</span>
                <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium">{load.notes}</p>
              </div>
            )}

            {/* Actions Triggers */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
              {canUserWrite && (
                <>
                  {load.status !== 'CANCELLED' && load.status !== 'COMPLETED' && (
                    <Button variant="danger" icon={Trash2} onClick={() => onCancelLoad(load.id)}>
                      Cancelar Carga
                    </Button>
                  )}
                  {(load.status === 'ASSIGNED' || load.status === 'IN_PROGRESS') && (
                    <Button 
                      variant="primary" 
                      icon={CheckCircle} 
                      onClick={() => {
                        setArrivedTrucksInput(load.maxTrucks || 1);
                        setArrivalNotes('');
                        setShowArrivalModal(true);
                      }}
                    >
                      Reportar Llegada
                    </Button>
                  )}
                </>
              )}

              {isCarrier && (
                <>
                  {load.status === 'PUBLISHED' && !hasApplied && (
                    <Button variant="primary" icon={Send} onClick={() => setShowPostulateModal(true)}>
                      Postularse a este viaje
                    </Button>
                  )}
                  {load.status === 'ASSIGNED' && (
                    <Button variant="primary" icon={CheckCircle} onClick={() => onStatusChange('IN_PROGRESS')}>
                      Iniciar Traslado
                    </Button>
                  )}
                  {load.status === 'IN_PROGRESS' && (
                    <Button variant="primary" icon={CheckCircle} onClick={() => onStatusChange('COMPLETED')}>
                      Finalizar Viaje
                    </Button>
                  )}
                </>
              )}

              {(isCarrier || canUserWrite) && load.status === 'IN_PROGRESS' && (
                <Button 
                  variant="outline" 
                  icon={AlertTriangle} 
                  className="border-amber-500/30 text-amber-600" 
                  onClick={() => setShowContingencyModal(true)}
                >
                  Reportar Contingencia
                </Button>
              )}
            </div>
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
                          setAssignDriverId('');
                          setAssignTruckId('');
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
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Asignar Recursos</span>
                    
                    {selectedApp?.status === 'ACCEPTED' ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-sm font-semibold">
                        Esta postulación ya ha sido aprobada y asignada.
                      </div>
                    ) : canUserWrite ? (
                      <>
                        <Select
                          label="Chofer Habilitado"
                          icon={User}
                          options={[
                            { value: '', label: 'Seleccione un chofer' },
                            ...carrierDrivers.map((d) => ({ value: String(d.id), label: d.name }))
                          ]}
                          value={assignDriverId}
                          onChange={(e) => setAssignDriverId(e.target.value)}
                        />
                        <Select
                          label="Camión Flota"
                          icon={TruckIcon}
                          options={[
                            { value: '', label: 'Seleccione un camión' },
                            ...carrierTrucks.map((t) => ({ value: String(t.id), label: `${t.plate} (${t.type})` }))
                          ]}
                          value={assignTruckId}
                          onChange={(e) => setAssignTruckId(e.target.value)}
                        />

                        <Button
                          variant="primary"
                          icon={CheckCircle}
                          onClick={onAssign}
                          disabled={!assignDriverId || !assignTruckId || acceptedCount >= maxCapacity}
                          isLoading={submitLoading}
                          className="w-full"
                        >
                          {acceptedCount >= maxCapacity ? 'Cupo completo' : 'Confirmar Asignación'}
                        </Button>
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 rounded-xl text-xs italic">
                        Solo los administradores y operadores pueden asignar recursos.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Assigned resources card (Admin view after assign)
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                  Recursos Asignados
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <Building size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Transportista</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.carrier?.name || 'Asignado'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <User size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Chofer</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.driver?.name || 'Asignado'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <TruckIcon size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Camión</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{load.truck?.plate || 'Asignado'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (() => {
            const myApp = load.applications?.find(app => app.carrierId === user?.carrierId);
            
            return (
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                    Tu Postulación
                  </h3>
                  {myApp ? (
                    <div className="p-4 rounded-xl flex items-center justify-between border bg-slate-50/50 dark:bg-zinc-800/30 border-slate-100 dark:border-zinc-850">
                      <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                        {myApp.status === 'PENDING' ? 'Postulado (En revisión)' :
                         myApp.status === 'ACCEPTED' ? 'Aprobada y Asignada' :
                         'No Seleccionada / Rechazada'}
                      </span>
                      <Badge variant={myApp.status === 'PENDING' ? 'warning' : myApp.status === 'ACCEPTED' ? 'success' : 'error'}>
                        {myApp.status === 'PENDING' ? 'PENDIENTE' : myApp.status === 'ACCEPTED' ? 'APROBADA' : 'RECHAZADA'}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Aún no te has postulado a esta carga.</p>
                  )}
                </div>

                {/* Show resource assignment if accepted */}
                {myApp?.status === 'ACCEPTED' && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                      Tripulación Asignada
                    </h3>
                    
                    {/* Display current assignment */}
                    <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 mb-4 text-xs font-semibold">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase font-bold">Chofer:</span>
                        <span className="text-slate-800 dark:text-zinc-200 font-bold">{load.driver?.name || 'No asignado'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase font-bold">Patente Camión:</span>
                        <span className="text-slate-800 dark:text-zinc-200 font-bold">{load.truck?.plate || 'No asignado'}</span>
                      </div>
                    </div>

                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Asignar / Cambiar Tripulación</span>
                    
                    <div className="space-y-4 pt-2">
                      <Select
                        label="Chofer Habilitado"
                        icon={User}
                        options={[
                          { value: '', label: 'Seleccione un chofer' },
                          ...carrierDrivers.map((d) => ({ value: String(d.id), label: d.name }))
                        ]}
                        value={localDriverId}
                        onChange={(e) => setLocalDriverId(e.target.value)}
                      />
                      <Select
                        label="Camión Flota"
                        icon={TruckIcon}
                        options={[
                          { value: '', label: 'Seleccione un camión' },
                          ...carrierTrucks.map((t) => ({ value: String(t.id), label: `${t.plate} (${t.type})` }))
                        ]}
                        value={localTruckId}
                        onChange={(e) => setLocalTruckId(e.target.value)}
                      />

                      <Button
                        variant="primary"
                        icon={CheckCircle}
                        onClick={() => onAssignResources?.(Number(localDriverId), Number(localTruckId))}
                        disabled={!localDriverId || !localTruckId}
                        isLoading={submitLoading}
                        className="w-full"
                      >
                        Guardar Tripulación
                      </Button>
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

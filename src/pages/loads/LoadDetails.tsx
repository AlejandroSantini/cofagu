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
  isAdmin: boolean;
  user: UserType | null;
  onCancelLoad: (id: number) => void;
  onApply: (notes: string) => Promise<boolean>;
  onStatusChange: (newStatus: string) => void;
  onReportContingency: (description: string, reportedBy: string) => Promise<boolean>;
  
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
  submitLoading: boolean;
}

export const LoadDetails: React.FC<LoadDetailsProps> = ({
  load,
  isAdmin,
  user,
  onCancelLoad,
  onApply,
  onStatusChange,
  onReportContingency,
  
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
  submitLoading
}) => {
  // Local modal states
  const [showPostulateModal, setShowPostulateModal] = useState(false);
  const [showContingencyModal, setShowContingencyModal] = useState(false);
  
  // Local input states
  const [postulateNotes, setPostulateNotes] = useState('');
  const [contingencyDesc, setContingencyDesc] = useState('');
  const [contingencyReporter, setContingencyReporter] = useState('');
  const [localSubmitLoading, setLocalSubmitLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Postulate Modal */}
      <Modal
        isOpen={showPostulateModal}
        onClose={() => setShowPostulateModal(false)}
        onConfirm={handleLocalApply}
        title="Postularse a Viaje"
        confirmText="Enviar Postulación"
        isLoading={localSubmitLoading}
      >
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Agrega un comentario u observación para tu postulación.</p>
          <textarea
            className="w-full bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white border-slate-100 dark:border-zinc-800 focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
            placeholder="Ej: Tengo camión batea disponible a 10 km..."
            value={postulateNotes}
            onChange={(e) => setPostulateNotes(e.target.value)}
          />
        </div>
      </Modal>

      {/* Contingency Modal */}
      <Modal
        isOpen={showContingencyModal}
        onClose={() => setShowContingencyModal(false)}
        onConfirm={handleLocalReportContingency}
        title="Reportar Contingencia"
        confirmText="Registrar Evento"
        isLoading={localSubmitLoading}
      >
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Describe el inconveniente o novedad surgido durante el traslado.</p>
          <textarea
            className="w-full bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white border-slate-100 dark:border-zinc-800 focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
            placeholder="Ej: Pinchadura de neumático en ruta 14..."
            value={contingencyDesc}
            onChange={(e) => setContingencyDesc(e.target.value)}
          />
          <Input
            label="Reportado por (Nombre)"
            placeholder="Ej: Chofer Juan Pérez"
            icon={User}
            value={contingencyReporter}
            onChange={(e) => setContingencyReporter(e.target.value)}
          />
        </div>
      </Modal>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Load Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Detalle del viaje</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {load.origin} → {load.destination}
                </h2>
              </div>
              <Badge variant={getStatusBadgeVariant(load.status)}>
                {load.status === 'PUBLISHED' ? 'DISPONIBLE' : 
                 load.status === 'ASSIGNED' ? 'ASIGNADO' : 
                 load.status === 'IN_PROGRESS' ? 'EN VIAJE' : 
                 load.status === 'COMPLETED' ? 'COMPLETADO' : 'CANCELADO'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Fecha de Carga</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mt-1">
                  <Calendar size={16} className="text-emerald-500" />
                  {new Date(load.date).toLocaleDateString('es-AR')}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Tarifa</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
                  <DollarSign size={16} />
                  ${Number(load.rate).toLocaleString('es-AR')}
                </span>
              </div>
              {load.notes && (
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Observaciones</span>
                  <span className="text-sm text-slate-600 dark:text-zinc-300 mt-1 block">
                    {load.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Operations Actions based on roles */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              {isAdmin ? (
                load.status !== 'CANCELLED' && (
                  <Button variant="danger" icon={Trash2} onClick={() => onCancelLoad(load.id)}>
                    Cancelar Carga
                  </Button>
                )
              ) : (
                <>
                  {load.status === 'PUBLISHED' && (
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

              {load.status === 'IN_PROGRESS' && (
                <Button variant="outline" icon={AlertTriangle} className="border-amber-500/30 text-amber-600" onClick={() => setShowContingencyModal(true)}>
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
          {isAdmin ? (
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
                          <Badge variant={app.status === 'PENDING' ? 'warning' : 'success'}>
                            {app.status}
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
                      disabled={!assignDriverId || !assignTruckId}
                      isLoading={submitLoading}
                      className="w-full"
                    >
                      Confirmar Asignación
                    </Button>
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
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Asignado</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <User size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Chofer</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Asignado</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <TruckIcon size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Camión</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Asignado</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Application status for carrier (Non-Admin)
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                Tu Postulación
              </h3>
              {load.applications?.some(app => app.carrierId === user?.carrierId) ? (
                <div className="p-4 bg-emerald-50/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Postulado</span>
                  <Badge variant="success">PENDIENTE</Badge>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Aún no te has postulado a esta carga.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

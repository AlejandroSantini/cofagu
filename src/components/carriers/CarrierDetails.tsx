import React from 'react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { ShieldAlert, Mail, Phone, Building, Plus, ChevronLeft, Copy } from 'lucide-react';

import type { Carrier, Driver, Truck, User } from '../../types';
import { Toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';

interface CarrierDetailsProps {
  carrier: Carrier;
  loading: boolean;
  detailTab: 'DRIVERS' | 'TRUCKS' | 'USERS' | 'CANCELLATIONS';
  setDetailTab: (tab: 'DRIVERS' | 'TRUCKS' | 'USERS' | 'CANCELLATIONS') => void;
  onEdit: (carrier: Carrier) => void;
  onBack: () => void;
  canWrite: boolean;
  onCopyCredentials: () => void;
  credentialsModal: { email: string; password?: string } | null;
  copied: boolean;
  cancelledApps?: any[];
  cancelledLoading?: boolean;
}


const CarrierDetails: React.FC<CarrierDetailsProps> = ({
  carrier,
  loading,
  detailTab,
  setDetailTab,
  onEdit,
  onBack,
  canWrite,
  onCopyCredentials,
  credentialsModal,
  cancelledApps = [],
  cancelledLoading = false
}) => {
  const { toast, hideToast } = useToast();

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Toast */}
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={carrier.name}
          description="Información detallada del transportista, choferes, flota y cancelaciones."
          icon={Building}
        />
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-fit">
          {canWrite && (
            <Button variant="primary" onClick={() => onEdit(carrier)} icon={Plus}>
              Editar Datos
            </Button>
          )}
          <Button variant="outline" icon={ChevronLeft} onClick={onBack}>
            Volver al Listado
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <ShieldAlert size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">CUIT</span>
            <span className="text-sm font-black text-slate-800 dark:text-zinc-200 font-mono">{carrier.cuit}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Mail size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Email</span>
            <span className="text-sm font-black text-slate-800 dark:text-zinc-200">{carrier.contactEmail}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Phone size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Teléfono</span>
            <span className="text-sm font-black text-slate-800 dark:text-zinc-200">{carrier.contactPhone}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium italic">Cargando detalles asociados...</div>
      ) : (
        <div className="space-y-6">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200 dark:border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setDetailTab('DRIVERS')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                detailTab === 'DRIVERS' ? 'border-emerald-500 text-emerald-600 bg-transparent' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Choferes ({carrier.drivers?.length || 0})
            </button>
            <button
              onClick={() => setDetailTab('TRUCKS')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                detailTab === 'TRUCKS' ? 'border-emerald-500 text-emerald-600 bg-transparent' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Camiones Flota ({carrier.trucks?.length || 0})
            </button>
            <button
              onClick={() => setDetailTab('USERS')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                detailTab === 'USERS' ? 'border-emerald-500 text-emerald-600 bg-transparent' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Cuentas de Acceso ({carrier.users?.length || 0})
            </button>
            <button
              onClick={() => setDetailTab('CANCELLATIONS')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                detailTab === 'CANCELLATIONS' ? 'border-emerald-500 text-emerald-600 bg-transparent' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Historial de Viajes ({cancelledApps.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div>
            {detailTab === 'DRIVERS' && (
              <Table
                columns={[
                  { header: 'Nombre', render: (d: Driver) => (<span className="font-bold text-slate-900 dark:text-white">{d.name}</span>) },
                  { header: 'DNI', render: (d: Driver) => (<span className="font-mono text-slate-600 dark:text-zinc-400">{d.dni}</span>) },
                  { header: 'Teléfono', render: (d: Driver) => (<span className="text-slate-600 dark:text-zinc-400">{d.phone}</span>) },
                ]}
                data={carrier.drivers || []}
                emptyMessage="Este transportista no tiene choferes registrados."
              />
            )}
            {detailTab === 'TRUCKS' && (
              <Table
                columns={[
                  { header: 'Patente', render: (t: Truck) => <span className="font-bold font-mono text-slate-900 dark:text-white">{t.plate}</span> },
                  { header: 'Tipo', render: (t: Truck) => <span className="text-slate-700 dark:text-zinc-300 font-semibold">{t.type}</span> },
                  { header: 'Capacidad', render: (t: Truck) => <span className="text-slate-600 dark:text-zinc-400 font-semibold">{Number(t.capacity).toLocaleString('es-AR')} kg</span> },
                  { header: 'Compañía Seguro Carga', render: (t: Truck) => <span className="text-slate-600 dark:text-zinc-400">{t.cargoInsuranceCompany || 'N/D'}</span> },
                  { header: 'Póliza Carga', render: (t: Truck) => <span className="text-slate-600 dark:text-zinc-400 font-mono">{t.cargoInsurancePolicy || 'N/D'}</span> },
                  {
                    header: 'Vencimiento Carga',
                    render: (t: Truck) => t.cargoInsuranceExpiration ? (
                      <span className="text-slate-600 dark:text-zinc-400">
                        {new Date(t.cargoInsuranceExpiration).toLocaleDateString('es-AR')}
                      </span>
                    ) : 'N/D'
                  },
                ]}
                data={carrier.trucks || []}
                emptyMessage="Este transportista no tiene camiones registrados."
              />
            )}
            {detailTab === 'USERS' && (
              <Table
                columns={[
                  { header: 'Nombre', render: (u: User) => <span className="font-bold text-slate-900 dark:text-white">{u.name}</span> },
                  { header: 'Email', render: (u: User) => <span className="text-slate-600 dark:text-zinc-400">{u.email}</span> },
                  { header: 'Rol de Acceso', render: (u: User) => <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold px-2 py-1 rounded-md">{u.role}</span> },
                ]}
                data={carrier.users || []}
                emptyMessage="Este transportista no tiene cuentas de usuario creadas."
              />
            )}
            {detailTab === 'CANCELLATIONS' && (
              <Table
                isLoading={cancelledLoading}
                columns={[
                  {
                    header: 'Fecha',
                    render: (app: any) => (
                      <span className="font-bold text-slate-900 dark:text-white">
                        {new Date(app.updatedAt || app.createdAt).toLocaleString('es-AR')}
                      </span>
                    )
                  },
                  {
                    header: 'Estado',
                    render: (app: any) => {
                      const isCompleted = app.status === 'COMPLETED' || app.tripStatus === 'COMPLETED';
                      return (
                        <Badge variant={isCompleted ? 'success' : 'neutral'}>
                          {isCompleted ? 'COMPLETADO' : 'CANCELADO'}
                        </Badge>
                      );
                    }
                  },
                  {
                    header: 'Chofer',
                    render: (app: any) => (
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">
                        {app.driver?.name || `ID: ${app.driverId || 'N/D'}`}
                      </span>
                    )
                  },
                  {
                    header: 'Camión',
                    render: (app: any) => (
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {app.truck?.chassisPlate || app.truck?.plate || `ID: ${app.truckId || 'N/D'}`}
                      </span>
                    )
                  },
                  {
                    header: 'Detalle / Motivo',
                    render: (app: any) => (
                      <span className={`text-xs font-bold ${app.status === 'COMPLETED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {app.notes || app.reason || (app.status === 'COMPLETED' ? 'Descarga realizada con éxito' : 'Sin motivo especificado')}
                      </span>
                    )
                  }
                ]}
                data={cancelledApps}
                emptyMessage="Este transportista aún no tiene historial registrado de viajes completados o cancelados."
              />
            )}


            {/* Credentials Modal */}
            {credentialsModal && (
              <Modal isOpen={!!credentialsModal} onClose={onCopyCredentials} title="Credenciales">
                <div className="p-4">
                  <p className="mb-2"><strong>Email:</strong> {credentialsModal.email}</p>
                  {credentialsModal.password && (
                    <p className="mb-2"><strong>Password:</strong> {credentialsModal.password}</p>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => {
                      const text = credentialsModal.password
                        ? `${credentialsModal.email}:${credentialsModal.password}`
                        : credentialsModal.email;
                      navigator.clipboard.writeText(text);
                    }}
                    icon={Copy}
                  >
                    Copiar
                  </Button>
                </div>
              </Modal>
            ) }
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CarrierDetails);

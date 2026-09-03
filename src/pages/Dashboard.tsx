import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { loadService, truckService } from '../api/services';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

import { type Load } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Loader2, Box, Truck, AlertTriangle, CheckCircle, FilePlus, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isStaff = useAuthStore((state) => state.isStaff());
  const canWrite = useAuthStore((state) => state.canWrite());
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPlayero = user?.role === 'PLAYERO' || user?.role === 'GAS_STATION' || user?.role === 'OPERATOR';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isLogistics = user?.role === 'LOGISTICS';

  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrierDocStatus, setCarrierDocStatus] = useState<'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'MISSING'>('APPROVED');

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await loadService.getLoads();
      if (res.data.success) {
        setLoads(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    
    // If user is a CARRIER, fetch their trucks to check insurance status
    if (user?.role === 'CARRIER') {
      try {
        const trkRes = await truckService.getTrucks();
        if (trkRes.data.success) {
          const trucks = trkRes.data.data;
          if (trucks.length === 0) {
            setCarrierDocStatus('MISSING');
          } else {
            const hasInvalid = trucks.some(t => t.cargoInsuranceStatus !== 'APPROVED' || (t.cargoInsuranceExpiration ? new Date(t.cargoInsuranceExpiration).getTime() <= Date.now() : true));
            if (hasInvalid) {
              setCarrierDocStatus('PENDING');
            } else {
              setCarrierDocStatus('APPROVED');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching carrier trucks:', err);
      }
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useAutoRefresh(fetchDashboardData);


  // Compute logistics metrics
  const pendingAssignments = loads.filter((l) => l.status === 'ACTIVE').length;
  const activeTrips = loads.filter((l) => l.status === 'ASSIGNED' || l.status === 'IN_PROGRESS').length;
  const completedTrips = loads.filter((l) => l.status === 'COMPLETED').length;
  
  // Count total contingencies reported
  const activeContingenciesCount = loads.reduce((acc, curr) => acc + (curr.contingencies?.length || 0), 0);

  // Latest loads to show in a table
  const recentLoads = loads.slice(0, 5);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'warning';
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'ASSIGNED': return 'info';
      case 'ACCEPTED': return 'info';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="font-medium">Cargando panel de control...</p>
      </div>
    );
  }

  const columns = [
    {
      header: 'Fecha',
      render: (l: Load) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {new Date(l.date).toLocaleDateString('es-AR')}
        </span>
      )
    },
    {
      header: 'Ruta',
      render: (l: Load) => (
        <span className="text-slate-700 dark:text-zinc-300 font-semibold">
          {l.origin} → {l.destination}
        </span>
      )
    },
    {
      header: 'Tarifa',
      render: (l: Load) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-black">
          ${Number(l.rate).toLocaleString('es-AR')}
        </span>
      )
    },
    {
      header: 'Estado',
      render: (l: Load) => (
        <Badge variant={getStatusBadgeVariant(l.status)}>
          {l.status === 'ACTIVE' ? 'DISPONIBLE' : 
           l.status === 'ASSIGNED' ? 'ASIGNADO' : 
           l.status === 'IN_PROGRESS' ? 'EN VIAJE' : 
           l.status === 'COMPLETED' ? 'COMPLETADO' : 'CANCELADO'}
        </Badge>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <PageHeader
          title="Panel de Control"
          description={`Bienvenido, ${user?.name}. Consulta el estado de la operación logística.`}
        />
        {canWrite && !isEmployee && !isPlayero && !isLogistics && (
          <Button variant="primary" icon={FilePlus} onClick={() => navigate('/loads')}>
            Publicar Nueva Carga
          </Button>
        )}
      </div>

      {/* Alerta de Seguro de Carga para Transportistas */}
      {!isStaff && user?.role === 'CARRIER' && (carrierDocStatus === 'MISSING' || carrierDocStatus === 'EXPIRED' || carrierDocStatus === 'REJECTED') && (
        <div className="p-4 md:p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 flex flex-col md:flex-row items-center md:justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-black text-rose-800 dark:text-rose-400">Póliza de seguro ausente o vencida</h4>
              <p className="text-xs text-rose-600 dark:text-rose-500 font-medium">Debes registrar o renovar tu póliza de seguro de carga para poder postularte a nuevos viajes.</p>
            </div>
          </div>
          <Button 
            variant="primary" 
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold w-full md:w-fit shrink-0 border-none shadow-lg shadow-rose-600/20"
            onClick={() => navigate('/trucks')}
          >
            Actualizar Camiones / Seguro
          </Button>

        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pendientes Asignación"
          value={pendingAssignments}
          icon={Box}
          color="bg-amber-500"
          onClick={() => navigate('/loads')}
        />
        <StatCard
          title="Viajes en Curso"
          value={activeTrips}
          icon={Truck}
          color="bg-blue-600"
          onClick={() => navigate('/loads')}
        />
        <StatCard
          title="Viajes Completados"
          value={completedTrips}
          icon={CheckCircle}
          color="bg-emerald-600"
          onClick={() => navigate('/loads')}
        />
        <StatCard
          title="Contingencias Activas"
          value={activeContingenciesCount}
          icon={AlertTriangle}
          color="bg-rose-600"
          onClick={() => navigate('/loads')}
        />
      </div>

      {/* Quick Links Section for Staff */}
      {isStaff && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Accesos Rápidos de Administración</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" icon={Truck} onClick={() => navigate('/carriers')} className="justify-start py-3">
              Administrar Transportistas
            </Button>
            {isAdmin && (
              <Button variant="outline" icon={Users} onClick={() => navigate('/users')} className="justify-start py-3">
                Administrar Cuentas / Personal
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Cargas Recientes</h3>
        <Table
          columns={columns}
          data={recentLoads}
          isLoading={false}
          onRowClick={() => navigate('/loads')}
        />
      </div>
    </div>
  );
};

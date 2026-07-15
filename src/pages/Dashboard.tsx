import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { loadService } from '../api/services';
import { type Load } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Loader2, Box, Truck, AlertTriangle, CheckCircle, FilePlus, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const user = useAuthStore((state) => state.user);

  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await loadService.getLoads();
        if (active && res.data.success) {
          setLoads(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Compute logistics metrics
  const pendingAssignments = loads.filter((l) => l.status === 'PUBLISHED' || l.status === 'PENDING').length;
  const activeTrips = loads.filter((l) => l.status === 'ASSIGNED' || l.status === 'IN_PROGRESS').length;
  const completedTrips = loads.filter((l) => l.status === 'COMPLETED').length;
  
  // Count total contingencies reported
  const activeContingenciesCount = loads.reduce((acc, curr) => acc + (curr.contingencies?.length || 0), 0);

  // Latest loads to show in a table
  const recentLoads = loads.slice(0, 5);

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
          {l.status === 'PUBLISHED' ? 'DISPONIBLE' : 
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
        {isAdmin && (
          <Button variant="primary" icon={FilePlus} onClick={() => navigate('/loads')}>
            Publicar Nueva Carga
          </Button>
        )}
      </div>

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

      {/* Quick Links Section for Admin */}
      {isAdmin && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Accesos Rápidos de Administración</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" icon={Truck} onClick={() => navigate('/carriers')} className="justify-start py-3">
              Administrar Transportistas
            </Button>
            <Button variant="outline" icon={Users} onClick={() => navigate('/drivers')} className="justify-start py-3">
              Administrar Choferes
            </Button>
            <Button variant="outline" icon={Truck} onClick={() => navigate('/trucks')} className="justify-start py-3">
              Administrar Camiones
            </Button>
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

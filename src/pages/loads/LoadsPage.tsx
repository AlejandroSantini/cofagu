import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadService, driverService, truckService } from '../../api/services';
import { type Load, type Driver, type Truck } from '../../types';
import { getErrorMessage } from '../../api/errorUtils';
import { type LoadFormValues } from '../../schemas/load.schema';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { ErrorMessage } from '../../components/ui/ErrorMessage';




import { useToast } from '../../hooks/useToast';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Toast } from '../../components/ui/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import { useAuthStore } from '../../store/useAuthStore';

// Tabs, Form & Details Subcomponents (Local to Page Module)
import { LoadsTable } from './LoadsTable';
import { LoadForm } from './LoadForm';
import { LoadDetails } from './LoadDetails';

import { Plus, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';

export const LoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isCarrier = user?.role === 'CARRIER';
  const isPlayero = user?.role === 'PLAYERO' || user?.role === 'GAS_STATION' || user?.role === 'OPERATOR';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canWrite = useAuthStore((state) => state.canWrite()) && !isPlayero;


  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  
  // Filtering & Selection for Assignment
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>(isEmployee ? 'ASSIGNED' : 'ACTIVE');

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState<number | null>(() => isCarrier ? user?.carrierId || null : null);
  const [carrierDrivers, setCarrierDrivers] = useState<Driver[]>([]);
  const [carrierTrucks, setCarrierTrucks] = useState<Truck[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [error, setError] = useState('');
  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delId, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number | string>();

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Auto-refresh using global configuration interval
  useAutoRefresh(triggerRefresh);

  useEffect(() => {
    let active = true;
    const fetchLoads = async () => {
      setLoading(true);
      setError('');
      try {
        const loadParams: { status?: string } = { status: activeTab };
        const res = activeTab === 'ACTIVE' 
          ? await loadService.getTrips(loadParams) 
          : await loadService.getLoads(loadParams);
        if (active && res.data && res.data.success !== false) {
          const rawData = Array.isArray(res.data) ? res.data : res.data.data;
          
          setLoads(rawData);
        }
      } catch (err) {
        console.error(err);
        if (active) setError('Error al cargar la información de cargas.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLoads();
    return () => { active = false; };
  }, [activeTab, refreshTrigger, isPlayero]);


  useEffect(() => {
    let active = true;
    const fetchSelectedLoad = async () => {
      if (!id) {
        if (active) setSelectedLoad(null);
        return;
      }

      setError('');
      try {
        let res;
        const type = searchParams.get('type');
        if (type === 'trip') {
          res = await loadService.getTrip(Number(id));
        } else if (type === 'load') {
          res = await loadService.getLoad(Number(id));
        } else {
          // Fallback if URL is accessed directly without type parameter
          if (activeTab === 'ACTIVE') {
            try {
              res = await loadService.getTrip(Number(id));
            } catch {
              res = await loadService.getLoad(Number(id));
            }
          } else {
            try {
              res = await loadService.getLoad(Number(id));
            } catch {
              res = await loadService.getTrip(Number(id));
            }
          }
        }
        
        if (active && res.data && res.data.success !== false) {
          setSelectedLoad(res.data.data || res.data);
          setLoadError(false);
        } else if (active) {
          setLoadError(true);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setLoadError(true);
          showToast('Error al cargar detalle del viaje.', 'error');
        }
      }
    };
    fetchSelectedLoad();
    return () => { active = false; };
  }, [id, refreshTrigger, activeTab]);

  // Load details refresh helper after action mutations
  const refreshDetails = async () => {
    triggerRefresh();
  };



  const isLogistics = user?.role === 'LOGISTICS';

  // Load carrier drivers/trucks ONLY when viewing detail or form (not for main loads table)
  useEffect(() => {
    const loadCarrierResources = async () => {
      try {
        const params = selectedCarrierId ? { carrierId: selectedCarrierId } : undefined;
        const [drvRes, trkRes] = await Promise.all([
          driverService.getDrivers(params),
          truckService.getTrucks(params)
        ]);
        if (drvRes.data.success) setCarrierDrivers(drvRes.data.data);
        if (trkRes.data.success) setCarrierTrucks(trkRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (selectedLoad || showForm) {
      loadCarrierResources();
    }
  }, [selectedCarrierId, selectedLoad, showForm]);


  const handleRowClick = async (load: Load) => {
    // If we're clicking a Load object (from a non-ACTIVE tab), navigate to its parent Trip ID
    // so we can see the full trip context (with all trucks) in the detail view.
    const targetId = load.tripId || load.id;
    // We navigate to parent trip ID so we can see the full trip context
    navigate(`/loads/${targetId}?type=trip`);
    setSelectedAppId(null);
    if (!isCarrier && !isLogistics) {
      setSelectedCarrierId(null);
      setCarrierDrivers([]);
      setCarrierTrucks([]);
    }
  };


  const onSubmit = async (data: LoadFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const res = await loadService.createTrip({
        ...data,
        rate: Number(data.rate),
        maxTrucks: Number(data.maxTrucks),
        loadingDate: new Date(data.loadingDate).toISOString(),
        quotaDate: new Date(data.quotaDate).toISOString(),
        date: new Date(data.loadingDate).toISOString()
      });
      if (res.data && res.data.success !== false) {
        showToast('Carga publicada con éxito');
        handleBack();
        triggerRefresh();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al publicar la carga.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setSubmitLoading(true);
    try {
      let isTrip = activeTab === 'ACTIVE';
      if (selectedLoad) {
        // En vista de detalle, sabemos si es viaje porque tiene array de loads/applications
        isTrip = searchParams.get('type') === 'trip' || (selectedLoad.loads !== undefined && selectedLoad.applications !== undefined);
      } else if (searchParams.get('type')) {
        isTrip = searchParams.get('type') === 'trip';
      }
      
      const res = isTrip 
        ? await loadService.deleteTrip(delId) 
        : await loadService.deleteLoad(delId);
      if (res.status === 204 || (res.data && res.data.success !== false) || !res.data) {
        showToast('Carga cancelada/eliminada correctamente');
        confirmDelete();
        navigate('/loads');
        triggerRefresh();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar la carga.'));
      cancelDelete();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApply = async (notes: string, driverId: number, truckId: number): Promise<boolean> => {
    if (!selectedLoad) return false;

    // For LOGISTICS, resolve carrierId from selected driver or truck if user.carrierId is null
    let targetCarrierId = user?.carrierId;
    if (!targetCarrierId && isLogistics) {
      const drv = carrierDrivers.find(d => d.id === driverId);
      const trk = carrierTrucks.find(t => t.id === truckId);
      targetCarrierId = drv?.carrierId || trk?.carrierId;
    }

    if (!targetCarrierId) {
      showToast('No se pudo determinar el transportista asociado a la postulación.', 'error');
      return false;
    }

    try {
      const res = await loadService.applyToTrip(selectedLoad.id, {
        carrierId: targetCarrierId,
        notes,
        driverId,
        truckId
      });
      if (res.data && res.data.success !== false) {
        showToast('Postulación enviada correctamente');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Error al enviar postulación';
      showToast(errMsg, 'error');
      if (err.response?.status === 400 && (errMsg.toLowerCase().includes('seguro') || errMsg.toLowerCase().includes('póliza'))) {
        setTimeout(() => {
          navigate('/trucks');
        }, 3000);
      }
    }
    return false;
  };


  const handleAssign = async () => {
    if (!selectedLoad || !selectedAppId) {
      showToast('Por favor, selecciona una postulación.', 'error');
      return;
    }
    const selectedApp = selectedLoad.applications?.find(a => a.id === selectedAppId);
    if (!selectedApp || !selectedApp.driverId || !selectedApp.truckId) {
      showToast('La postulación no cuenta con chofer o camión propuesto.', 'error');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await loadService.acceptTripApplication(selectedAppId, {
        driverId: Number(selectedApp.driverId),
        truckId: Number(selectedApp.truckId)
      });
      if (res.data && (res.data as any).success !== false) {
        showToast('Viaje asignado correctamente', 'success');

        navigate('/loads');
        setSelectedAppId(null);
        setSelectedCarrierId(null);
        setCarrierDrivers([]);
        setCarrierTrucks([]);
        refreshDetails();
        triggerRefresh();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al asignar viaje.'), 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLoad) return;
    setSubmitLoading(true);
    try {
      const res = await loadService.patchLoadStatus(selectedLoad.id, newStatus);
      if (res.data && res.data.success !== false) {
        showToast(`Estado actualizado a ${newStatus}`);
        refreshDetails();
        triggerRefresh();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al actualizar estado.'), 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReportContingency = async (description: string, reportedBy: string): Promise<boolean> => {
    if (!selectedLoad || !description) return false;
    try {
      const res = await loadService.reportContingency(selectedLoad.id, {
        description,
        reportedBy: reportedBy || user?.name || 'Chofer'
      });
      if (res.data && res.data.success !== false) {
        showToast('Contingencia reportada con éxito');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al registrar contingencia'), 'error');
    }
    return false;
  };


  const handleConfirmDeparture = async (appId: number, ctg: string, loadedWeight: number): Promise<boolean> => {
    if (!selectedLoad) return false;
    
    let targetId = appId;
    const isLoad = selectedLoad.tripId !== undefined && selectedLoad.applications === undefined;
    
    // If selectedLoad is a Trip, it has .loads and .applications
    if (!isLoad && selectedLoad.loads && selectedLoad.applications) {
      const app = selectedLoad.applications.find((a: any) => a.id === appId);
      if (app) {
        const matchedLoad = selectedLoad.loads.find((l: any) => 
          l.carrierId === app.carrierId && 
          (l.truckId === app.truckId || l.truckId === app.truck?.id)
        );
        if (matchedLoad) {
          targetId = Number(matchedLoad.id);
        } else {
          showToast('No se encontró la carga correspondiente para esta postulación.', 'error');
          return false;
        }
      }
    }

    try {
      const res = await loadService.confirmDeparture(targetId, { ctg, loadedWeight });
      if (res.data && res.data.success !== false) {
        showToast('Salida de balanza confirmada con éxito', 'success');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al confirmar salida de balanza.'), 'error');
    }
    return false;
  };

  const handleStartTrip = async (appId: number, ctg?: string): Promise<boolean> => {
    try {
      const res = await loadService.startTrip(appId, ctg ? { ctg } : undefined);
      if (res.data && res.data.success !== false) {
        showToast('Viaje iniciado correctamente', 'success');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al iniciar el viaje.'), 'error');
    }
    return false;
  };



  const handleCompleteLoad = async (data: { 
    unloadedWeight: number; 
    fuelConsumption?: number; 
    mileage?: number;
    arrivedTrucks?: number;
    notes?: string;
    invoiceUrl?: string;
    waybillUrl?: string;
  }, appId?: number): Promise<boolean> => {
    if (!selectedLoad) return false;
    setSubmitLoading(true);
    
    let targetId = selectedLoad.id;
    // Check if the currently viewed item is a Trip (parent) instead of a Load
    const isLoad = 'tripId' in selectedLoad && selectedLoad.tripId !== null;

    if (appId && !isLoad) {
      const selectedApp = selectedLoad.applications?.find((a: any) => a.id === appId);
      if (selectedApp) {
        const matchedLoad = selectedLoad.loads?.find((l: any) => 
          l.carrierId === selectedApp.carrierId && 
          (l.truckId === selectedApp.truckId || l.truckId === selectedApp.truck?.id)
        );
        if (matchedLoad) {
          targetId = matchedLoad.id;
        } else {
          showToast('No se encontró la carga correspondiente para esta postulación.', 'error');
          setSubmitLoading(false);
          return false;
        }
      }
    }

    try {
      const res = await loadService.postCompletionData(targetId, {
        unloadedWeight: data.unloadedWeight,
        fuelConsumption: data.fuelConsumption,
        mileage: data.mileage,
        invoiceUrl: data.invoiceUrl,
        waybillUrl: data.waybillUrl,
        notes: data.notes,
        arrivedTrucks: data.arrivedTrucks
      });
      if (res.data && res.data.success !== false) {
        showToast('Viaje finalizado con éxito', 'success');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al finalizar el viaje'), 'error');
    } finally {
      setSubmitLoading(false);
    }
    return false;
  };


  const handleBack = () => {
    setError('');
    setShowForm(false);
  };

  const handleTabChange = (tab: 'ACTIVE' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    setLoading(true);
    setActiveTab(tab);
  };

  const [plateSearch, setPlateSearch] = useState('');


  // Loads filtered for playero fuel search (search input only)
  const fuelFilteredLoads = isPlayero 
    ? loads.filter(l => {
        if (!plateSearch) return true;
        const q = plateSearch.toLowerCase();
        const chassis = l.truck?.chassisPlate?.toLowerCase() || '';
        const trailer = l.truck?.trailerPlate?.toLowerCase() || '';
        const plate = l.truck?.plate?.toLowerCase() || '';
        const driver = l.driver?.name?.toLowerCase() || '';
        const carrier = l.carrier?.name?.toLowerCase() || '';
        return chassis.includes(q) || trailer.includes(q) || plate.includes(q) || driver.includes(q) || carrier.includes(q);
      })
    : loads;


  const [noShowModalLoad, setNoShowModalLoad] = useState<{ loadId: number; appId?: number } | null>(null);

  const handleConfirmNoShow = async () => {
    if (!noShowModalLoad) return;
    setSubmitLoading(true);
    try {
      const res = await loadService.reportNoShow(noShowModalLoad.loadId, { applicationId: noShowModalLoad.appId });
      if (res.data && res.data.success !== false) {
        showToast('Inasistencia registrada correctamente. Se liberó el cupo y se acumuló falta.', 'success');
        setNoShowModalLoad(null);
        if (selectedLoad?.id === noShowModalLoad.loadId) {
          setSelectedLoad(null);
        }
        triggerRefresh();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al registrar la inasistencia.'), 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      <Modal
        isOpen={!!noShowModalLoad}
        onClose={() => setNoShowModalLoad(null)}
        onConfirm={handleConfirmNoShow}
        title="Confirmar Inasistencia ('No Llegó a Horario')"
        description="¿Está seguro de marcar la inasistencia para este camión? Esto cancelará la reserva del turno actual, liberará el cupo para que se re-publique la carga, y acumulará una falta para el chofer y el camión (los cuales se suspenderán automáticamente si alcanzan 5 faltas)."
        type="danger"
        confirmText="Confirmar Inasistencia"
        isLoading={submitLoading}
      />

      <Modal
        isOpen={loadError}
        onClose={() => {
          setLoadError(false);
          navigate('/loads', { replace: true });
        }}
        title="Viaje no encontrado"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-zinc-400">
            No se pudo cargar la información del viaje. Es posible que no exista, haya sido eliminado o no tengas los permisos necesarios para verlo.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setLoadError(false);
                navigate('/loads', { replace: true });
              }}
            >
              Volver al listado
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDelOpen}
        onClose={cancelDelete}
        onConfirm={handleDelete}
        title="Cancelar Carga"
        description="¿Estás seguro de que deseas cancelar esta publicación? Se desactivará del listado."
        type="danger"
        confirmText="Cancelar Carga"
        isLoading={submitLoading}
      />

      {!(id && !selectedLoad && !loadError) && (
        <div className="flex flex-col gap-6 mb-8">
          <PageHeader
            title={
              isPlayero
                ? 'Control de Combustible (Estación / Playero)'
                : isEmployee
                  ? 'Control de Báscula y Planta'
                  : showForm
                    ? 'Nueva Carga'
                    : selectedLoad
                      ? 'Detalle de Carga'
                      : 'Gestión de Cargas'
            }
            description={
              isPlayero
                ? 'Consulta de camiones activos habilitados para carga de combustible.'
                : isEmployee
                  ? 'Listado de cargas para ingreso/salida y registro de CTG.'
                  : showForm 
                    ? 'Publica una nueva solicitud de traslado.' 
                    : selectedLoad 
                      ? 'Consulta la información, postulaciones y estado operativo de este viaje.' 
                      : 'Consulta cargas disponibles, postulaciones y estado operativo.'
            }
          />

          <div>
            {showForm || selectedLoad ? (
              <Button
              variant="outline"
              onClick={() => {
                if (showForm) handleBack();
                if (id) navigate('/loads');
              }}
              icon={ChevronLeft}
              className="w-full md:w-fit px-8"
            >
              Volver al Listado
            </Button>
          ) : (
            canWrite && !isEmployee && !isPlayero && !isLogistics && (
              <Button 
                variant="primary" 
                icon={Plus} 
                onClick={() => setShowForm(true)} 
                className="w-full md:w-fit px-8"
              >
                Publicar Carga
              </Button>
              )
            )}
          </div>
        </div>
      )}

      <ErrorMessage message={error} className="mb-6" />

      {id && !selectedLoad && !loadError ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">Cargando información del viaje...</p>
        </div>
      ) : id && loadError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
          <AlertTriangle size={48} className="mb-4 opacity-80" />
          <p className="font-black text-xl mb-2">No se pudo cargar el viaje</p>
          <p className="text-sm font-medium mb-6">El viaje solicitado no existe o no tienes permisos para acceder a él.</p>
          <Button variant="outline" className="border-rose-300 hover:bg-rose-100 text-rose-700 font-bold" onClick={() => navigate('/loads')}>
            Volver al listado principal
          </Button>
        </div>
      ) : isPlayero && !selectedLoad ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-md font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
              Buscador de Camiones Autorizados a Combustible
            </h3>
            <input
              type="text"
              placeholder="Buscar por Patente (Chasis/Acoplado), Chofer o Transportista..."
              value={plateSearch}
              onChange={(e) => setPlateSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <Table
              columns={[
                {
                  header: 'Patente (Chasis / Acoplado)',
                  render: (loadItem: Load) => (
                    <div className="flex flex-col">
                      <span className="font-bold font-mono text-slate-900 dark:text-white uppercase">
                        {loadItem.truck?.chassisPlate || loadItem.truck?.plate || 'S/P'}
                      </span>
                      {loadItem.truck?.trailerPlate && (
                        <span className="text-xs font-mono text-slate-500 uppercase">
                          Acoplado: {loadItem.truck.trailerPlate}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Chofer',
                  render: (loadItem: Load) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {loadItem.driver?.name || 'N/D'}
                      </span>
                      {loadItem.driver?.dni && (
                        <span className="text-xs text-slate-500 font-mono">
                          DNI: {loadItem.driver.dni}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Transportista',
                  render: (loadItem: Load) => (
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">
                      {loadItem.carrier?.name || 'N/D'}
                    </span>
                  )
                },
                {
                  header: 'Franja Horaria',
                  render: (loadItem: Load) => (
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {loadItem.loadingTimeStart && loadItem.loadingTimeEnd 
                        ? `${loadItem.loadingTimeStart} - ${loadItem.loadingTimeEnd} hs` 
                        : '08:00 - 12:00'}
                    </span>
                  )
                },
                {
                  header: 'Cereal',
                  render: (loadItem: Load) => (
                    <span className="font-medium text-slate-600 dark:text-zinc-400">
                      {loadItem.cereal || 'Soja'}
                    </span>
                  )
                }
              ]}
              data={fuelFilteredLoads}
              isLoading={loading}
              emptyMessage="No se encontraron camiones autorizados para combustible."
            />
          </div>
        </div>
      ) : selectedLoad ? (



        <LoadDetails
          load={selectedLoad}
          user={user}
          onCancelLoad={askDelete}
          onApply={handleApply}
          onStatusChange={handleStatusChange}
          onReportContingency={handleReportContingency}
          onConfirmDeparture={handleConfirmDeparture}
          onStartTrip={handleStartTrip}
          onCompleteLoad={handleCompleteLoad}
          onCancelApplication={async (appId, reason) => {
            try {
              const res = await loadService.cancelApplication(appId, reason);
              if (res.data && res.data.success !== false) {
                showToast('Postulación cancelada correctamente', 'success');
                refreshDetails();
                triggerRefresh();
                return true;
              }
            } catch (err) {
              showToast(getErrorMessage(err, 'Error al cancelar la postulación'), 'error');
            }
            return false;
          }}
          onNoShow={async (loadId, appId) => {
            try {
              const res = await loadService.reportNoShow(loadId, { applicationId: appId });
              if (res.data && res.data.success !== false) {
                showToast("Inasistencia ('No Llegó') registrada. Cupo liberado.", 'success');
                refreshDetails();
                triggerRefresh();
                return true;
              }
            } catch (err) {
              showToast(getErrorMessage(err, 'Error al registrar la inasistencia'), 'error');
            }
            return false;
          }}


          selectedAppId={selectedAppId}
          setSelectedAppId={setSelectedAppId}
          setSelectedCarrierId={setSelectedCarrierId}
          carrierDrivers={carrierDrivers}
          carrierTrucks={carrierTrucks}
          onAssign={handleAssign}
          onAssignResources={async (driverId, truckId) => {
            if (!selectedLoad) return;
            setSubmitLoading(true);
            try {
              const res = await loadService.assignResources(selectedLoad.id, { driverId, truckId });
              if (res.data && res.data.success !== false) {
                showToast('Recursos de viaje asignados con éxito', 'success');
                await refreshDetails();
                triggerRefresh();
              }
            } catch (err) {
              showToast(getErrorMessage(err, 'Error al asignar recursos.'), 'error');
            } finally {
              setSubmitLoading(false);
            }
          }}
          onUpdateLoad={async (id, data) => {
            setSubmitLoading(true);
            try {
              const res = await loadService.updateLoad(id, data);
              if (res.data && res.data.success !== false) {
                showToast('Viaje actualizado con éxito', 'success');
                await refreshDetails();
                triggerRefresh();
                return true;
              }
            } catch (err) {
              showToast(getErrorMessage(err, 'Error al actualizar el viaje.'), 'error');
            }
            setSubmitLoading(false);
            return false;
          }}
          submitLoading={submitLoading}
        />
      ) : showForm ? (
        <LoadForm 
          onSubmit={onSubmit} 
          onCancel={handleBack} 
          isLoading={submitLoading} 
        />
      ) : (
        <div className="space-y-4">
          {/* Tab Filters Navigation */}
          <div className="flex border-b border-slate-200 dark:border-zinc-800 overflow-x-auto">
            {(isCarrier ? [
              { id: 'ACTIVE', label: 'Disponibles' },
              { id: 'ASSIGNED', label: 'Asignados' },
              { id: 'IN_PROGRESS', label: 'En Curso' },
              { id: 'COMPLETED', label: 'Completados' }
            ] : isEmployee ? [
              { id: 'ASSIGNED', label: 'Asignados' },
              { id: 'IN_PROGRESS', label: 'En Curso' },
              { id: 'COMPLETED', label: 'Completadas' },
              { id: 'CANCELLED', label: 'Canceladas' }
            ] : [
              { id: 'ACTIVE', label: 'Disponibles' },
              { id: 'ASSIGNED', label: 'Asignados' },
              { id: 'IN_PROGRESS', label: 'En Curso' },
              { id: 'COMPLETED', label: 'Completadas' },
              { id: 'CANCELLED', label: 'Canceladas' }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>



          {/* Tab Content Render */}
          <LoadsTable
            loads={loads}
            isLoading={loading}
            onRowClick={handleRowClick}
            statusFilter={activeTab}
            isCarrier={isCarrier}
            myCarrierId={user?.carrierId}
          />
        </div>
      )}
    </div>
  );
};

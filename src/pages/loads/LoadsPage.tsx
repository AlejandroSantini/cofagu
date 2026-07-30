import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadService, driverService, truckService } from '../../api/services';
import { type Load, type Driver, type Truck } from '../../types';
import { getErrorMessage } from '../../api/errorUtils';
import { type LoadFormValues } from '../../schemas/load.schema';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/ui/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import { useAuthStore } from '../../store/useAuthStore';

// Tabs, Form & Details Subcomponents (Local to Page Module)
import { LoadsTable } from './LoadsTable';
import { LoadForm } from './LoadForm';
import { LoadDetails } from './LoadDetails';

import { Plus, ChevronLeft } from 'lucide-react';

export const LoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isCarrier = user?.role === 'CARRIER';
  const canWrite = useAuthStore((state) => state.canWrite());

  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  
  // Filtering & Selection for Assignment
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'ASSIGNED' | 'COMPLETED'>('ALL');
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<number | null>(() => isCarrier ? user?.carrierId || null : null);
  const [carrierDrivers, setCarrierDrivers] = useState<Driver[]>([]);
  const [carrierTrucks, setCarrierTrucks] = useState<Truck[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [error, setError] = useState('');
  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delId, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<number>();

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Load list effect
  useEffect(() => {
    let active = true;
    const fetchLoads = async () => {
      setLoading(true);
      try {
        const loadParams: { status?: string } = {};
        if (activeTab !== 'ALL') {
          if (activeTab === 'PUBLISHED') loadParams.status = 'PUBLISHED';
          if (activeTab === 'ASSIGNED') loadParams.status = 'IN_PROGRESS';
          if (activeTab === 'COMPLETED') loadParams.status = 'COMPLETED';
        }
        const res = await loadService.getLoads(loadParams);
        if (active && res.data.success) {
          setLoads(res.data.data);
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
  }, [activeTab, refreshTrigger]);

  // Load details refresh helper after action mutations
  const refreshDetails = async () => {
    if (!selectedLoad) return;
    try {
      const detailsRes = await loadService.getLoad(selectedLoad.id);
      if (detailsRes.data.success) setSelectedLoad(detailsRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load carrier drivers/trucks when an application is selected for assignment
  useEffect(() => {
    if (!selectedCarrierId) return;

    const loadCarrierResources = async () => {
      try {
        const [drvRes, trkRes] = await Promise.all([
          driverService.getDrivers({ carrierId: selectedCarrierId }),
          truckService.getTrucks({ carrierId: selectedCarrierId })
        ]);
        if (drvRes.data.success) setCarrierDrivers(drvRes.data.data);
        if (trkRes.data.success) setCarrierTrucks(trkRes.data.data);
      } catch (err) {
        console.error(err);
        showToast('Error al cargar choferes/camiones del transportista.', 'error');
      }
    };
    loadCarrierResources();
  }, [selectedCarrierId]);

  const handleRowClick = async (load: Load) => {
    setSelectedLoad(load);
    setSelectedAppId(null);
    if (!isCarrier) {
      setSelectedCarrierId(null);
      setCarrierDrivers([]);
      setCarrierTrucks([]);
    }
  };

  const onSubmit = async (data: LoadFormValues) => {
    setSubmitLoading(true);
    setError('');
    try {
      const res = await loadService.createLoad({
        ...data,
        rate: Number(data.rate),
        maxTrucks: Number(data.maxTrucks),
        loadingDate: new Date(data.loadingDate).toISOString(),
        quotaDate: new Date(data.quotaDate).toISOString(),
        date: new Date(data.loadingDate).toISOString()
      });
      if (res.data.success) {
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
      const res = await loadService.deleteLoad(delId);
      if (res.data.success) {
        showToast('Carga cancelada/eliminada correctamente');
        confirmDelete();
        setSelectedLoad(null);
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
    if (!user?.carrierId) {
      showToast('Tu cuenta no está asociada a ninguna empresa transportista.', 'error');
      return false;
    }
    try {
      const res = await loadService.applyToLoad(selectedLoad.id, {
        carrierId: user.carrierId,
        notes,
        driverId,
        truckId
      });
      if (res.data.success) {
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
          navigate('/documents');
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
      const res = await loadService.assignLoad(selectedLoad.id, {
        applicationId: selectedAppId,
        driverId: Number(selectedApp.driverId),
        truckId: Number(selectedApp.truckId)
      });
      if (res.data.success) {
        if (res.data.data.cupoCompleto) {
          showToast('¡Cupo completo! La carga pasó a En Curso.', 'success');
        } else {
          showToast('Viaje asignado correctamente', 'success');
        }
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
      if (res.data.success) {
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
      if (res.data.success) {
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



  const handleCompleteLoad = async (data: { 
    unloadedWeight: number; 
    fuelConsumption?: number; 
    mileage?: number;
    arrivedTrucks?: number;
    notes?: string;
    invoiceUrl?: string;
    waybillUrl?: string;
  }): Promise<boolean> => {
    if (!selectedLoad) return false;
    setSubmitLoading(true);
    try {
      const res = await loadService.postCompletionData(selectedLoad.id, {
        unloadedWeight: data.unloadedWeight,
        fuelConsumption: data.fuelConsumption,
        mileage: data.mileage,
        invoiceUrl: data.invoiceUrl,
        waybillUrl: data.waybillUrl,
        notes: data.notes,
        arrivedTrucks: data.arrivedTrucks
      });
      if (res.data.success) {
        showToast('Viaje finalizado con éxito', 'success');
        refreshDetails();
        triggerRefresh();
        return true;
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al finalizar el viaje.'), 'error');
    } finally {
      setSubmitLoading(false);
    }
    return false;
  };

  const handleBack = () => {
    setShowForm(false);
  };

  const handleTabChange = (tab: 'ALL' | 'PUBLISHED' | 'ASSIGNED' | 'COMPLETED') => {
    setLoading(true);
    setActiveTab(tab);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

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

      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          title={showForm ? 'Nueva Carga' : selectedLoad ? 'Detalle de Carga' : 'Gestión de Cargas'}
          description={
            showForm 
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
                if (selectedLoad) setSelectedLoad(null);
              }}
              icon={ChevronLeft}
              className="w-full md:w-fit px-8"
            >
              Volver al Listado
            </Button>
          ) : (
            canWrite && (
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

      <ErrorMessage message={error} className="mb-6" />
      {selectedLoad ? (
        <LoadDetails
          load={selectedLoad}
          user={user}
          onCancelLoad={askDelete}
          onApply={handleApply}
          onStatusChange={handleStatusChange}
          onReportContingency={handleReportContingency}
          onCompleteLoad={handleCompleteLoad}
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
              if (res.data.success) {
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
              if (res.data.success) {
                showToast('Viaje actualizado con éxito', 'success');
                await refreshDetails();
                triggerRefresh();
                return true;
              }
            } catch (err) {
              showToast(getErrorMessage(err, 'Error al actualizar el viaje.'), 'error');
            } finally {
              setSubmitLoading(false);
            }
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
          <div className="flex border-b border-slate-200 dark:border-zinc-800">
            {([
              { id: 'ALL', label: 'Todas' },
              { id: 'PUBLISHED', label: 'Disponibles' },
              { id: 'ASSIGNED', label: 'En Curso' },
              { id: 'COMPLETED', label: 'Completadas' }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
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
            statusFilter={activeTab !== 'ALL' ? activeTab : undefined}
            isCarrier={isCarrier}
          />
        </div>
      )}
    </div>
  );
};

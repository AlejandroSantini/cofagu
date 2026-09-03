import React, { useState, useEffect } from "react";
import {
  type Load,
  type Driver,
  type Truck,
  type User as UserType,
} from "../../types";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

import {
  Trash2,
  Calendar,
  DollarSign,
  Send,
  CheckCircle,
  AlertTriangle,
  User,
  Truck as TruckIcon,
  Building,
  Loader2,
  Scale,
  Layers,
  Clock,
  XCircle,
} from "lucide-react";

import { api } from "../../api/axios";

const SecureImagePreview: React.FC<{
  src: string;
  alt?: string;
  className?: string;
}> = ({ src, alt, className = "max-h-48 rounded-lg object-contain" }) => {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (
      !src ||
      typeof src !== "string" ||
      src.startsWith("data:") ||
      src.startsWith("blob:")
    ) {
      return;
    }

    let active = true;
    let currentBlobUrl = "";
    const fetchSecureImage = async () => {
      setLoading(true);
      try {
        const response = await api.get(src, { responseType: "blob" });
        if (active && response.data) {
          currentBlobUrl = URL.createObjectURL(response.data);
          setBlobUrl(currentBlobUrl);
        }
      } catch (error) {
        console.error("Error fetching secure image preview:", error);
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

  const displayUrl =
    src &&
    typeof src === "string" &&
    (src.startsWith("data:") || src.startsWith("blob:"))
      ? src
      : blobUrl;

  if (loading) {
    return <Loader2 className="animate-spin text-slate-400" size={24} />;
  }

  if (!displayUrl) {
    return null;
  }

  return (
    <a
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-zoom-in block"
    >
      <img src={displayUrl} alt={alt || "Adjunto"} className={className} />
    </a>
  );
};

interface LoadDetailsProps {
  load: Load;
  user: UserType | null;
  onCancelLoad: (id: number | string) => void;
  onApply: (
    notes: string,
    driverId: number,
    truckId: number,
  ) => Promise<boolean>;
  onStatusChange: (newStatus: string) => void;
  onReportContingency: (
    description: string,
    reportedBy: string,
  ) => Promise<boolean>;
  onConfirmDeparture?: (appId: number, ctg: string, loadedWeight: number) => Promise<boolean>;
  onStartTrip?: (appId: number, ctg?: string) => Promise<boolean>;
  onCancelApplication?: (appId: number, reason: string) => Promise<boolean>;
  onNoShow?: (loadId: number | string, appId?: number) => Promise<boolean>;
  onCompleteLoad: (data: {
    unloadedWeight: number;
    fuelConsumption?: number;
    mileage?: number;
    arrivedTrucks?: number;
    notes?: string;
    invoiceUrl?: string;
    waybillUrl?: string;
  }, appId?: number) => Promise<boolean>;
  onUpdateLoad?: (id: number | string, data: Partial<Load>) => Promise<boolean>;

  // Assignment resources props
  carrierDrivers: Driver[];
  carrierTrucks: Truck[];
  onFetchCarrierResources?: () => void;
  onAssign: (appId?: number) => void;
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
  onConfirmDeparture,
  onStartTrip,
  onCancelApplication,
  onCompleteLoad,
  onUpdateLoad,
  carrierDrivers,
  carrierTrucks,
  onFetchCarrierResources,
  onAssign,
  submitLoading,
}) => {
  // Local modal states
  const [showPostulateModal, setShowPostulateModal] = useState(false);
  const [showContingencyModal, setShowContingencyModal] = useState(false);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showStartTripModal, setShowStartTripModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showDelayedModal, setShowDelayedModal] = useState(false);

  const [plantCtg, setPlantCtg] = useState("");
  const [plantLoadedWeight, setPlantLoadedWeight] = useState("");
  // Local input states
  const [postulateNotes, setPostulateNotes] = useState("");
  const [postulateCarrierId, setPostulateCarrierId] = useState("");
  const [postulateDriverId, setPostulateDriverId] = useState("");
  const [postulateTruckId, setPostulateTruckId] = useState("");
  const [contingencyDesc, setContingencyDesc] = useState("");
  const [contingencyReporter, setContingencyReporter] = useState("");
  
  const [managedCarriers, setManagedCarriers] = useState<Carrier[]>([]);
  
  const isAdmin = user?.role === "ADMIN";
  const isOperator = user?.role === "OPERATOR";
  const isLogistics = user?.role === "LOGISTICS";
  const canUserWrite = isAdmin || isOperator || isLogistics;
  const isCarrier = user?.role === "CARRIER";
  // LOGISTICS se comporta como transportista en la vista (no ve panel admin, no ve balancera)
  const isStaff =
    isAdmin ||
    isOperator ||
    user?.role === "EMPLOYEE" ||
    user?.role === "PLAYERO" ||
    user?.role === "GAS_STATION";
  const isBalancero =
    isOperator ||
    user?.role === "EMPLOYEE" ||
    user?.role === "PLAYERO" ||
    user?.role === "GAS_STATION";

  useEffect(() => {
    if (isLogistics) {
      import('../../api/services').then(({ carrierService }) => {
        carrierService.getCarriers().then(res => {
          if (res.data.success) {
            setManagedCarriers(res.data.data);
          }
        });
      });
    }
  }, [isLogistics]);
  const [arrivedTrucksInput, setArrivedTrucksInput] = useState(
    load.maxTrucks || 1,
  );
  const [completionNotes, setCompletionNotes] = useState("");
  const [unloadedWeightInput, setUnloadedWeightInput] = useState("");
  const [localSubmitLoading, setLocalSubmitLoading] = useState(false);

  const [showRejectedModal, setShowRejectedModal] = useState(false);

  // Cancel application modal state
  const [showCancelAppModal, setShowCancelAppModal] = useState(false);
  const [cancelAppId, setCancelAppId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const acceptedCount =
    load.applications?.filter((a) => a.status === "ACCEPTED").length ||
    (load.carrier ||
    load.driver ||
    load.truck ||
    load.status === "ASSIGNED" ||
    load.status === "IN_PROGRESS" ||
    load.status === "COMPLETED"
      ? 1
      : 0);
  const maxCapacity = load.maxTrucks || 1;


  // Para LOGISTICS, el carrierId efectivo se resuelve desde los trucks cargados (user.carrierId es null)
  const effectiveCarrierId: number | null | undefined = isLogistics
    ? (carrierTrucks[0]?.carrierId ?? null)
    : user?.carrierId;

  // Con paginación no podemos saber si TODOS los camiones del transportista ya están postulados
  // (solo tenemos los camiones de la página actual cargada).
  // Por eso nunca ocultamos el botón basándonos en eso: dejamos que el modal informe si no hay disponibles.
  const appliedTruckIds = new Set(
    (load.applications || [])
      .filter(
        (a) => a.carrierId === effectiveCarrierId && a.status !== "CANCELLED",
      )
      .map((a) => a.truckId),
  );
  // El botón se oculta solo si el carrier YA tiene una postulación activa Y no hay camiones disponibles
  // en la página actual. Si hay paginación, es posible que haya más camiones no cargados aún.
  const availableTrucks = carrierTrucks.filter(
    (t) => !appliedTruckIds.has(t.id),
  );
  // Mostrar botón siempre que haya camiones disponibles en la página cargada,
  // o si aún no se cargaron camiones (loading), o si hay 0 aplicaciones propias (primer postulación).
  const myActiveApps = (load.applications || []).filter(
    (a) => a.carrierId === effectiveCarrierId && a.status !== "CANCELLED",
  );
  const hasApplied =
    myActiveApps.length > 0 &&
    availableTrucks.length === 0 &&
    carrierTrucks.length > 0;

  const myTrips = (load?.applications || []).filter(
    (app) => app.carrierId === effectiveCarrierId,
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "warning";
      case "ACTIVE":
        return "success";
      case "PENDING":
        return "warning";
      case "ASSIGNED":
        return "info";
      case "ACCEPTED":
        return "info";
      case "IN_PROGRESS":
        return "primary";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const isTruckInsuranceValid = (t: Truck) => {
    // Si el seguro de carga ha sido aprobado por la administración, la validación del seguro se considera válida
    if (t.cargoInsuranceStatus === "APPROVED") {
      return true;
    }
    // Si viene la propiedad 'habilitado' en el objeto del camión, se evalúa directamente
    if (typeof t.habilitado === "boolean") {
      return t.habilitado;
    }
    // Si no viene el status pero sí viene el objeto simple dentro de la postulación
    return true;
  };

  const handleLocalApply = async () => {
    if (!postulateDriverId || !postulateTruckId) return;
    const selectedTruck = carrierTrucks.find(
      (t) => String(t.id) === postulateTruckId,
    );
    if (selectedTruck && !isTruckInsuranceValid(selectedTruck)) {
      alert(
        "El seguro de carga del camión seleccionado está vencido o incompleto. Debe actualizar los datos del camión para poder viajar.",
      );
      return;
    }
    setLocalSubmitLoading(true);
    const success = await onApply(
      postulateNotes,
      Number(postulateDriverId),
      Number(postulateTruckId),
    );
    setLocalSubmitLoading(false);
    if (success) {
      setShowPostulateModal(false);
      setPostulateNotes("");
      setPostulateDriverId("");
      setPostulateTruckId("");
    }
  };

  const [activeAppId, setActiveAppId] = useState<number | null>(null);

  const handleLocalPlantSave = async () => {
    const trimmedCtg = plantCtg.trim();
    const weightNum = Number(plantLoadedWeight);
    if (!trimmedCtg || isNaN(weightNum) || weightNum <= 0) return;

    setLocalSubmitLoading(true);
    let success = false;

    if (onConfirmDeparture && activeAppId) {
      success = await onConfirmDeparture(activeAppId, trimmedCtg, weightNum);
    } else if (onUpdateLoad) {
      success = await onUpdateLoad(load.id, {
        ctg: trimmedCtg,
        loadedWeight: weightNum,
        status: "IN_PROGRESS",
      } as any);
    }
    setLocalSubmitLoading(false);
    if (success) {
      setShowPlantModal(false);
      setActiveAppId(null);
      setPlantCtg("");
      setPlantLoadedWeight("");
    }
  };

  const handleLocalReportContingency = async () => {
    setLocalSubmitLoading(true);
    const success = await onReportContingency(
      contingencyDesc,
      contingencyReporter,
    );
    setLocalSubmitLoading(false);
    if (success) {
      setShowContingencyModal(false);
      setContingencyDesc("");
      setContingencyReporter("");
    }
  };

  const handleLocalComplete = async () => {
    // Bloque 3: usar el valor real del input de kilos descargados
    const kg = Number(unloadedWeightInput);
    if (!kg || kg <= 0) return;

    setLocalSubmitLoading(true);

    const onSuccess = () => {
      setShowCompletionModal(false);
      setActiveAppId(null);
      setArrivedTrucksInput(load.maxTrucks || 1);
      setCompletionNotes("");
      setUnloadedWeightInput("");
    };

    if (onCompleteLoad) {
      const ok = await onCompleteLoad({
        unloadedWeight: kg,
        arrivedTrucks: arrivedTrucksInput
          ? Number(arrivedTrucksInput)
          : undefined,
        notes: completionNotes || undefined,
      }, activeAppId || undefined);
      if (ok) onSuccess();
    }

    setLocalSubmitLoading(false);
  };

  const estadoReal = (() => {
    if (isCarrier && myTrips && myTrips.length > 0) {
      const activeMyTrips = myTrips.filter((a) => a.status === "ACCEPTED");
      if (activeMyTrips.length > 0) {
        if (activeMyTrips.some((a) => a.tripStatus === "IN_PROGRESS"))
          return "IN_PROGRESS";
        if (activeMyTrips.every((a) => a.tripStatus === "COMPLETED"))
          return "COMPLETED";
        return "ASSIGNED";
      }
    }
    if (load.applications) {
      const acceptedTrips = load.applications.filter(
        (app) => app.status === "ACCEPTED",
      );
      if (acceptedTrips && acceptedTrips.length > 0) {
        if (acceptedTrips.some((a) => a.tripStatus === "IN_PROGRESS"))
          return "IN_PROGRESS";
        if (acceptedTrips.every((a) => a.tripStatus === "COMPLETED"))
          return "COMPLETED";
        return "ASSIGNED";
      }
    }
    return load.status;
  })();

  return (
    <div className="space-y-6">
      {/* Report Delayed Modal */}
      <Modal
        isOpen={showDelayedModal}
        onClose={() => setShowDelayedModal(false)}
        onConfirm={async () => {
          setLocalSubmitLoading(true);
          await onStatusChange("DELAYED");
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
          await onStatusChange("REJECTED");
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
        isConfirmDisabled={
          !postulateDriverId ||
          !postulateTruckId ||
          availableTrucks.length === 0 ||
          (isLogistics && !postulateCarrierId)
        }
      >
        <div className="space-y-4 pt-2">
          {isLogistics && (
            <Select
              label="Transportista"
              icon={User}
              options={managedCarriers.map(c => ({
                value: String(c.id),
                label: c.name
              }))}
              value={postulateCarrierId}
              onChange={(e) => {
                setPostulateCarrierId(e.target.value);
                setPostulateDriverId("");
                setPostulateTruckId("");
              }}
            />
          )}

          {(!isLogistics || postulateCarrierId) && availableTrucks.length === 0 && carrierTrucks.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-sm text-amber-700 dark:text-amber-300 font-medium">
              ⚠️ Todos los camiones de tu flota ya están postulados a esta
              carga. Si tenés más camiones que no aparecen aquí, verificá que
              estén cargados en el sistema.
            </div>
          ) : (!isLogistics || postulateCarrierId) ? (
            <>
              <p className="text-sm text-slate-500">
                ¿Deseas postularte a esta solicitud de carga? Por favor
                seleccioná el chofer y camión que realizarán el viaje:
              </p>
              <Select
                label="Chofer Habilitado"
                icon={User}
                options={carrierDrivers
                  .filter(d => !isLogistics || d.carrierId === Number(postulateCarrierId))
                  .map((d) => {
                  const isSuspended =
                    d.isSuspended ||
                    (d.suspendedUntil
                      ? new Date(d.suspendedUntil) > new Date()
                      : false);
                  const suffix = isSuspended
                    ? ` - Suspendido hasta ${d.suspendedUntil ? new Date(d.suspendedUntil).toLocaleDateString("es-AR") : "N/D"}`
                    : "";
                  return {
                    value: String(d.id),
                    label: `${d.name} (DNI: ${d.dni})${suffix}`,
                    disabled: isSuspended,
                  };
                })}
                value={postulateDriverId}
                onChange={(e) => setPostulateDriverId(e.target.value)}
              />
              <Select
                label="Camión Flota"
                icon={TruckIcon}
                options={availableTrucks
                  .filter(t => !isLogistics || t.carrierId === Number(postulateCarrierId))
                  .map((t) => {
                  const plateText = t.chassisPlate || t.plate || "S/P";
                  const validInsurance = isTruckInsuranceValid(t);
                  const isSuspended =
                    t.isSuspended ||
                    (t.suspendedUntil
                      ? new Date(t.suspendedUntil) > new Date()
                      : false);
                  const expired = t.cargoInsuranceExpiration
                    ? new Date(t.cargoInsuranceExpiration) < new Date()
                    : true;

                  let suffix = "";
                  if (isSuspended) {
                    suffix = ` - Suspendido hasta ${t.suspendedUntil ? new Date(t.suspendedUntil).toLocaleDateString("es-AR") : "N/D"}`;
                  } else if (!validInsurance) {
                    suffix = expired
                      ? " - Seguro Carga Vencido (Bloqueado)"
                      : " - Seguro Carga Incompleto (Bloqueado)";
                  }

                  const disabled = isSuspended || !validInsurance;
                  return {
                    value: String(t.id),
                    label: `${plateText} (${t.type})${suffix}`,
                    disabled,
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
            </>
          ) : null}
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
        title="Registrar Carta de Porte (CTG) y Peso de Balanza"
        confirmText="Confirmar Salida de Balanza"
        onConfirm={handleLocalPlantSave}
        isLoading={localSubmitLoading}
        isConfirmDisabled={
          !plantCtg.trim() ||
          !plantLoadedWeight ||
          Number(plantLoadedWeight) <= 0
        }
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500">
            Ingrese el Código CTG y los Kilos Cargados en Báscula para confirmar
            la salida del camión:
          </p>
          <Input
            label="Código CTG *"
            placeholder="Ej: 123456789"
            value={plantCtg}
            onChange={(e) => setPlantCtg(e.target.value)}
            className="py-2.5"
          />
          <Input
            label="Kilos Cargados en Báscula *"
            type="number"
            step="any"
            min="1"
            placeholder="Ej: 30500"
            value={plantLoadedWeight}
            onChange={(e) => setPlantLoadedWeight(e.target.value)}
            className="py-2.5"
          />
        </div>
      </Modal>

      {/* Completion Modal - campo obligatorio de kilos descargados */}
      <Modal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setActiveAppId(null);
          setUnloadedWeightInput("");
        }}
        title="Registrar Descarga en Destino"
        confirmText="Confirmar Llegada"
        onConfirm={handleLocalComplete}
        isLoading={localSubmitLoading}
        isConfirmDisabled={
          !unloadedWeightInput || Number(unloadedWeightInput) <= 0
        }
        type="success"
      >
        <div className="space-y-4 pt-2">
          {(() => {
            const activeTrip = (load.applications || []).find(
              (a) => a.id === activeAppId,
            );
            const plate =
              activeTrip?.truck?.chassisPlate ||
              activeTrip?.truck?.plate ||
              load.truck?.plate;
            const driver = activeTrip?.driver?.name || load.driver?.name;
            if (plate || driver) {
              return (
                <p className="text-sm text-slate-500">
                  Registrando descarga para el camión{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {plate ? `[${plate}]` : ""}
                  </strong>
                  {driver ? ` — Chofer: ${driver}` : ""}.
                </p>
              );
            }
            return null;
          })()}
          <Input
            label="Kilos Descargados en Destino *"
            type="number"
            step="any"
            min="1"
            placeholder="Ej: 29500"
            value={unloadedWeightInput}
            onChange={(e) => setUnloadedWeightInput(e.target.value)}
            className="py-2.5"
            icon={Scale}
          />
          <p className="text-xs text-slate-400">
            Este valor es obligatorio. El backend rechazará la solicitud si no
            se envía.
          </p>
        </div>
      </Modal>

      <div className="max-w-6xl mx-auto space-y-6 w-full">
        {/* Main Details Panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Detalles de Ruta
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {load.origin} → {load.destination}
              </h2>
            </div>
            <Badge variant={getStatusBadgeVariant(estadoReal)}>
              {estadoReal === "PUBLISHED" 
                ? "DISPONIBLE"
                : estadoReal === "ACTIVE"
                  ? "ACTIVO"
                  : estadoReal === "ASSIGNED"
                    ? "ASIGNADO"
                    : estadoReal === "IN_PROGRESS"
                      ? "EN VIAJE"
                      : estadoReal === "COMPLETED"
                        ? "COMPLETADO"
                        : "CANCELADO"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Fecha de Carga
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                  {new Date(load.loadingDate || load.date).toLocaleDateString(
                    "es-AR",
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Fecha de Cupo
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                  {load.quotaDate
                    ? new Date(load.quotaDate).toLocaleDateString("es-AR")
                    : "No especificada"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Horario de Carga
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                  {load.loadingTimeStart && load.loadingTimeEnd
                    ? `${load.loadingTimeStart} - ${load.loadingTimeEnd} hs`
                    : "No especificado"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Building size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">
                  Cereal / Producto
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                  {load.cereal || "No especificado"}
                </span>
              </div>
            </div>

            {!(
              user?.role === "OPERATOR" ||
              user?.role === "PLAYERO" ||
              user?.role === "EMPLOYEE" ||
              user?.role === "GAS_STATION"
            ) && (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">
                      Tarifa
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                      {load.rate != null && !isNaN(Number(load.rate))
                        ? `$${Number(load.rate).toLocaleString("es-AR")}`
                        : "S/I"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <TruckIcon size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">
                      Cupos Disponibles
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                      {load.cuposPendientes !== undefined
                        ? `${load.cuposPendientes} libres`
                        : `${load.maxTrucks ? load.maxTrucks - acceptedCount : 1} libres`}
                    </span>
                  </div>
                </div>

                {/* Progress metric for arrived/completed trucks */}
                {acceptedCount > 0 && isAdmin && (
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase">
                        Camiones Arribados
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                        {load.applications?.filter(
                          (a) =>
                            a.status === "ACCEPTED" &&
                            a.tripStatus === "COMPLETED",
                        ).length || 0}{" "}
                        / {load.maxTrucks || acceptedCount} en destino
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {load.ctg && (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Send size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">
                    Código CTG
                  </span>
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
                  <span className="text-xs font-bold text-slate-400 block uppercase">
                    Kilos Cargados
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    {Number(load.loadedWeight).toLocaleString("es-AR")} kg
                  </span>
                </div>
              </div>
            )}
          </div>

          {load.notes && (
            <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/50">
              <span className="text-xs font-bold text-slate-400 block uppercase mb-1">
                Notas Adicionales
              </span>
              <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium">
                {load.notes}
              </p>
            </div>
          )}

          {(() => {
            if (!isAdmin) return null;
            
            const validTargetGroups = (load.targetGroups || []).filter(
              (tg) => tg.groupId !== null && tg.groupId !== undefined,
            );
            if (validTargetGroups.length === 0) return null;

            return (
              <div className="bg-emerald-500/5 dark:bg-zinc-800/40 p-4 rounded-xl border border-emerald-500/20 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers
                    size={18}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    Publicación Dirigida a Grupos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {validTargetGroups.map((tg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-750 text-xs"
                    >
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {tg.group?.name || `Grupo ID: ${tg.groupId}`}
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ${Number(tg.rate).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {load.status === "COMPLETED" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 space-y-4">
              <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle size={20} />
                Datos de Finalización de Viaje
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {load.unloadedWeight != null &&
                  Number(load.unloadedWeight) > 0 && (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-400 block uppercase mb-1">
                        Kilos Descargados
                      </span>
                      <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                        {Number(load.unloadedWeight).toLocaleString("es-AR")} kg
                      </span>
                    </div>
                  )}
                {load.fuelConsumption ? (
                  <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-1">
                      Consumo de Combustible
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                      {load.fuelConsumption} Lts
                    </span>
                  </div>
                ) : null}
                {load.mileage ? (
                  <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-400 block uppercase mb-1">
                      Kilometraje Recorrido
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-200">
                      {load.mileage} km
                    </span>
                  </div>
                ) : null}
                {(!load.unloadedWeight || Number(load.unloadedWeight) === 0) &&
                  !load.fuelConsumption &&
                  !load.mileage && (
                    <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-lg border border-emerald-100/50 dark:border-zinc-800 col-span-full">
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Todos los camiones arribaron a destino correctamente.
                        Viaje finalizado.
                      </span>
                    </div>
                  )}
              </div>

              {(load.invoiceUrl || load.waybillUrl) && (
                <div className="pt-4 border-t border-emerald-100/50 dark:border-emerald-900/20 space-y-4">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Documentación Adjunta
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {load.invoiceUrl && (
                      <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-500">
                          Factura / Remito
                        </span>
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center justify-center p-2">
                          <SecureImagePreview src={load.invoiceUrl} />
                        </div>
                      </div>
                    )}
                    {load.waybillUrl && (
                      <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-500">
                          Carta de Porte
                        </span>
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
            {(isAdmin || isOperator) &&
              load.status !== "CANCELLED" &&
              load.status !== "COMPLETED" && (
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    if (load.loads !== undefined) {
                      const hasActive = load.loads.some(l => l.status === 'IN_PROGRESS' || l.status === 'COMPLETED');
                      if (hasActive) {
                        if (!window.confirm("ADVERTENCIA: Este viaje ya tiene camiones en curso o completados. Cancelar el viaje principal podría afectar la trazabilidad de esos camiones. ¿Está COMPLETAMENTE seguro de cancelar el viaje entero?")) {
                          return;
                        }
                      }
                    }
                    onCancelLoad(load.id);
                  }}
                >
                  {load.loads !== undefined ? "Cancelar Viaje Completo" : "Cancelar Carga"}
                </Button>
              )}
            {(isCarrier || isLogistics) && (
              <>
                {(load.status === "PUBLISHED" || load.status === "ACTIVE") && !hasApplied && load.cuposPendientes !== 0 && (
                  <Button
                    variant="primary"
                    icon={Send}
                    onClick={() => {
                      if (onFetchCarrierResources) {
                        onFetchCarrierResources();
                      }
                      setShowPostulateModal(true);
                    }}
                  >
                    Postularse a este viaje
                  </Button>
                )}
              </>
            )}

            {(isCarrier || canUserWrite) &&
              (load.status === "IN_PROGRESS" ||
                myTrips.some(
                  (t) =>
                    t.tripStatus === "IN_PROGRESS" ||
                    t.tripStatus === "ASSIGNED",
                )) && (
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
          {load.unloadedWeight != null &&
            load.loadedWeight != null &&
            Number(load.unloadedWeight) < Number(load.loadedWeight) && (
              <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle
                      size={18}
                      className="text-amber-600 dark:text-amber-400"
                    />
                    <span>
                      Diferencia de Kilos Faltantes Detectada en Destino:{" "}
                      {(
                        Number(load.loadedWeight) - Number(load.unloadedWeight)
                      ).toLocaleString("es-AR")}{" "}
                      kg
                    </span>
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
                  El peso descargado (
                  {Number(load.unloadedWeight).toLocaleString("es-AR")} kg) es
                  menor al cargado en origen (
                  {Number(load.loadedWeight).toLocaleString("es-AR")} kg).
                </p>

                {canUserWrite && !load.differenceAdjusted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                    onClick={async () => {
                      if (onUpdateLoad) {
                        const ok = await onUpdateLoad(load.id, {
                          differenceAdjusted: true,
                        } as any);
                        if (ok)
                          alert(
                            "Diferencia de kilos marcada como ajustada en cuenta corriente. Se desmarcó el bloqueo de postulación.",
                          );
                      }
                    }}
                  >
                    Marcar como Ajustado / Facturado en Cuenta Corriente
                  </Button>
                )}
              </div>
            )}
        </div>

        {!isLogistics && isStaff ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
              Postulaciones y Viajes Asignados (
              {isBalancero
                ? load.applications?.filter((a) => a.status === "ACCEPTED")
                    .length || 0
                : load.applications?.length || 0}
              )
            </h3>

            {(() => {
              let appsToShow = load.applications || [];
              if (isBalancero) {
                appsToShow = appsToShow.filter((a) => a.status === "ACCEPTED");
              }

              // If no applications and we're just checking accepted trips from direct assignment
              const rawAcceptedApps = appsToShow.filter(
                (a) => a.status === "ACCEPTED",
              );
              const directAssignmentTrip =
                (load.carrier ||
                  load.driver ||
                  load.truck ||
                  load.status === "ASSIGNED" ||
                  load.status === "IN_PROGRESS" ||
                  load.status === "COMPLETED" ||
                  load.applicationId) &&
                rawAcceptedApps.length === 0
                  ? ({
                      id:
                        typeof load.applicationId === "number"
                          ? load.applicationId
                          : typeof load.id === "number"
                            ? Number(load.id) || 1
                            : 1,
                      status: "ACCEPTED",
                      tripStatus:
                        load.status === "COMPLETED"
                          ? "COMPLETED"
                          : load.status === "IN_PROGRESS"
                            ? "IN_PROGRESS"
                            : "ASSIGNED",
                      ctg: load.ctg,
                      loadedWeight: load.loadedWeight,
                      unloadedWeight: load.unloadedWeight,
                      carrier: load.carrier,
                      driver: load.driver,
                      truck: load.truck,
                    } as any)
                  : null;

              const hasAnythingToShow =
                appsToShow.length > 0 || (isBalancero && directAssignmentTrip);

              if (!hasAnythingToShow) {
                return (
                  <p className="text-sm text-slate-500 italic">
                    Esperando postulaciones de transportistas...
                  </p>
                );
              }

              return (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {appsToShow.map((app) => {
                    const matchedLoad = load.loads?.find((l: any) => 
                      l.carrierId === app.carrierId && 
                      (l.truckId === app.truckId || l.truckId === app.truck?.id)
                    );

                    const isPending = app.status === "PENDING";
                    const isAccepted = app.status === "ACCEPTED";
                    const tripStatus =
                      matchedLoad?.status ||
                      app.tripStatus ||
                      (load.status === "COMPLETED"
                        ? "COMPLETED"
                        : load.status === "IN_PROGRESS"
                          ? "IN_PROGRESS"
                          : "ASSIGNED");
                    const tripCtg = matchedLoad?.ctg || app.ctg || load.ctg || "";
                    const loadedW = matchedLoad?.loadedWeight ?? app.loadedWeight ?? load.loadedWeight;
                    const unloadedW = matchedLoad?.unloadedWeight ?? app.unloadedWeight ?? load.unloadedWeight;
                    const canManageCtg =
                      user?.role !== "ADMIN" &&
                      (isStaff ||
                        user?.role === "OPERATOR" ||
                        user?.role === "EMPLOYEE" ||
                        user?.role === "PLAYERO" ||
                        user?.role === "GAS_STATION");

                    return (
                      <div
                        key={app.id}
                        className={`p-4 border rounded-xl border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 ${!isPending && !isAccepted ? "opacity-60" : ""}`}
                      >
                        <div className="flex justify-between items-center mb-1 border-b border-slate-200/60 dark:border-zinc-700 pb-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {app.carrier?.name ||
                              load.carrier?.name ||
                              "Transportista"}
                          </span>
                          <Badge
                            variant={
                              isAccepted
                                ? tripStatus === "COMPLETED"
                                  ? "success"
                                  : tripStatus === "IN_PROGRESS"
                                    ? "primary"
                                    : "info"
                                : isPending
                                  ? "warning"
                                  : "error"
                            }
                          >
                            {isAccepted
                              ? tripStatus === "COMPLETED"
                                ? "COMPLETADO"
                                : tripStatus === "IN_PROGRESS"
                                  ? "EN VIAJE"
                                  : "ASIGNADO"
                              : isPending
                                ? "PENDIENTE"
                                : "RECHAZADA"}
                          </Badge>
                        </div>

                        {app.notes && !isAccepted && (
                          <p className="text-xs text-slate-500 mt-2 italic">
                            "{app.notes}"
                          </p>
                        )}

                        <div className="space-y-3 mt-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">
                                  Camión
                                </span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                                  {app.truck?.chassisPlate ||
                                    app.truck?.plate ||
                                    load.truck?.plate ||
                                    "S/P"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">
                                  Chofer
                                </span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {app.driver?.name ||
                                    load.driver?.name ||
                                    "N/D"}
                                </span>
                              </div>
                            </div>

                            {isAccepted && tripCtg && (
                              <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800 flex justify-between">
                                <span>
                                  CTG: <strong>{tripCtg}</strong>
                                </span>
                                {loadedW != null && (
                                  <span>
                                    Cargado:{" "}
                                    <strong>
                                      {Number(loadedW).toLocaleString("es-AR")}{" "}
                                      kg
                                    </strong>
                                  </span>
                                )}
                              </div>
                            )}

                            {isAccepted && unloadedW != null && (
                              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Kilos Descargados:{" "}
                                {Number(unloadedW).toLocaleString("es-AR")} kg
                              </div>
                            )}

                            <div className="flex flex-col gap-2 mt-2">
                              {/* ACCEPTED ACTIONS (CTG) */}
                              {isAccepted && canManageCtg &&
                                (tripStatus === "ASSIGNED" ||
                                  tripStatus === "IN_PROGRESS" ||
                                  app.status === "ACCEPTED") && (
                                  <Button
                                    variant={tripCtg ? "outline" : "primary"}
                                    size="sm"
                                    icon={CheckCircle}
                                    className="w-full text-xs font-bold"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveAppId(app.id);
                                      setPlantCtg(tripCtg);
                                      setPlantLoadedWeight(
                                        loadedW ? String(loadedW) : "",
                                      );
                                      setShowPlantModal(true);
                                    }}
                                  >
                                    {tripCtg
                                      ? "Editar CTG / Báscula"
                                      : "Cargar CTG (Carta de Porte)"}
                                  </Button>
                                )}

                              {/* PENDING ACTIONS (APPROVE & REJECT) */}
                              {isPending && !isBalancero && canUserWrite && (() => {
                                const proposedTruck =
                                  app?.truck ||
                                  carrierTrucks.find(
                                    (t) => t.id === app?.truckId,
                                  );
                                const isProposedTruckInvalid = proposedTruck
                                  ? !isTruckInsuranceValid(proposedTruck)
                                  : false;

                                return (
                                  <>
                                    {isProposedTruckInvalid && (
                                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-semibold space-y-1">
                                        <p className="font-bold">
                                          ⚠️ Seguro de camión propuesto
                                          inválido
                                        </p>
                                        <p className="opacity-90">
                                          El seguro del camión seleccionado
                                          está vencido o incompleto. El
                                          transportista debe actualizar los
                                          datos.
                                        </p>
                                      </div>
                                    )}
                                    <Button
                                      variant="primary"
                                      icon={CheckCircle}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAssign(app.id);
                                      }}
                                      disabled={
                                        !app?.driverId ||
                                        !app?.truckId ||
                                        acceptedCount >= maxCapacity ||
                                        isProposedTruckInvalid
                                      }
                                      isLoading={submitLoading}
                                      className="w-full"
                                    >
                                      {acceptedCount >= maxCapacity
                                        ? "Cupo completo"
                                        : isProposedTruckInvalid
                                          ? "Seguro Vencido / Incompleto"
                                          : "Aprobar Postulación"}
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                      </div>
                    );
                  })}

                  {/* Direct Assignment Fallback (when no applications exist but load has resources) */}
                  {directAssignmentTrip && appsToShow.length === 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-zinc-700 pb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {directAssignmentTrip.carrier?.name ||
                            load.carrier?.name ||
                            "Transportista"}
                        </span>
                        <Badge
                          variant={
                            directAssignmentTrip.tripStatus === "COMPLETED"
                              ? "success"
                              : directAssignmentTrip.tripStatus ===
                                  "IN_PROGRESS"
                                ? "primary"
                                : "info"
                          }
                        >
                          {directAssignmentTrip.tripStatus === "COMPLETED"
                            ? "COMPLETADO"
                            : directAssignmentTrip.tripStatus === "IN_PROGRESS"
                              ? "EN VIAJE"
                              : "ASIGNADO"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">
                            Camión
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                            {directAssignmentTrip.truck?.chassisPlate ||
                              directAssignmentTrip.truck?.plate ||
                              load.truck?.plate ||
                              "S/P"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">
                            Chofer
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {directAssignmentTrip.driver?.name ||
                              load.driver?.name ||
                              "N/D"}
                          </span>
                        </div>
                      </div>

                      {directAssignmentTrip.ctg && (
                        <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800 flex justify-between">
                          <span>
                            CTG: <strong>{directAssignmentTrip.ctg}</strong>
                          </span>
                          {directAssignmentTrip.loadedWeight != null && (
                            <span>
                              Cargado:{" "}
                              <strong>
                                {Number(
                                  directAssignmentTrip.loadedWeight,
                                ).toLocaleString("es-AR")}{" "}
                                kg
                              </strong>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-2">
                        {user?.role !== "ADMIN" &&
                          (isStaff ||
                            user?.role === "OPERATOR" ||
                            user?.role === "EMPLOYEE" ||
                            user?.role === "PLAYERO" ||
                            user?.role === "GAS_STATION") && (
                            <Button
                              variant={
                                directAssignmentTrip.ctg ? "outline" : "primary"
                              }
                              size="sm"
                              icon={CheckCircle}
                              className="w-full text-xs font-bold"
                              onClick={() => {
                                setActiveAppId(directAssignmentTrip.id);
                                setPlantCtg(directAssignmentTrip.ctg);
                                setPlantLoadedWeight(
                                  directAssignmentTrip.loadedWeight
                                    ? String(directAssignmentTrip.loadedWeight)
                                    : "",
                                );
                                setShowPlantModal(true);
                              }}
                            >
                              {directAssignmentTrip.ctg
                                ? "Editar CTG / Báscula"
                                : "Cargar CTG (Carta de Porte)"}
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          (() => {
            // Carrier view: show all their accepted trips (one per truck)
            const myAcceptedTrips = myTrips.filter(
              (app) => app.status === "ACCEPTED",
            );
            const myPendingApps = myTrips.filter(
              (app) => app.status === "PENDING",
            );

            return (
              <div className="space-y-6">
                {/* If no applications at all */}
                {myTrips.length === 0 && (
                  <div className="p-6 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Aún no te has postulado a este viaje.
                    </p>
                  </div>
                )}

                {/* Pending applications — one card per truck */}
                {myPendingApps.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                      Tus Postulaciones Pendientes ({myPendingApps.length})
                    </h3>
                    {myPendingApps.map((pendingApp) => (
                      <div key={pendingApp.id} className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                            Postulado — en revisión por el operador
                          </span>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {pendingApp.driver && (
                              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <span className="font-semibold">Chofer:</span>
                                {pendingApp.driver.name}
                              </span>
                            )}
                            {pendingApp.truck && (
                              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <span className="font-semibold">Camión:</span>
                                {(pendingApp.truck as any).chassisPlate || pendingApp.truck.plate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="warning">PENDIENTE</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={XCircle}
                            className="border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                            onClick={() => {
                              setCancelAppId(pendingApp.id);
                              setShowCancelAppModal(true);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ))}
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
                        const matchedLoad = load.loads?.find((l: any) => 
                          l.carrierId === trip.carrierId && 
                          (l.truckId === trip.truckId || l.truckId === trip.truck?.id)
                        );
                        
                        const effectiveTripStatus =
                          matchedLoad?.status ||
                          trip.tripStatus ||
                          (load.status === "COMPLETED"
                            ? "COMPLETED"
                            : load.status === "IN_PROGRESS"
                              ? "IN_PROGRESS"
                              : "ASSIGNED");
                        const isTripInProgress =
                          effectiveTripStatus === "IN_PROGRESS" ||
                          load.status === "IN_PROGRESS";
                        const isTripCompleted =
                          effectiveTripStatus === "COMPLETED" ||
                          load.status === "COMPLETED";
                        const tripCtg = matchedLoad?.ctg || trip.ctg || "";
                        const loadedW = matchedLoad?.loadedWeight ?? trip.loadedWeight;

                        const driverName =
                          trip.driver?.name ||
                          carrierDrivers.find((d) => d.id === trip.driverId)
                            ?.name ||
                          "Chofer Asignado";
                        const truckPlate =
                          trip.truck?.chassisPlate ||
                          trip.truck?.plate ||
                          carrierTrucks.find((t) => t.id === trip.truckId)
                            ?.plate ||
                          "S/P";
                        const truckType =
                          trip.truck?.type ||
                          carrierTrucks.find((t) => t.id === trip.truckId)
                            ?.type ||
                          "N/D";

                        return (
                          <div
                            key={trip.id}
                            className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-3"
                          >
                            {/* Header */}
                            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-zinc-700 pb-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {driverName}
                              </span>
                              <Badge
                                variant={
                                  isTripCompleted
                                    ? "success"
                                    : isTripInProgress
                                      ? "primary"
                                      : "info"
                                }
                              >
                                {isTripCompleted
                                  ? "COMPLETADO"
                                  : isTripInProgress
                                    ? "EN VIAJE"
                                    : "ASIGNADO"}
                              </Badge>
                            </div>

                            {/* Truck info */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">
                                  Patente
                                </span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                                  {truckPlate}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block uppercase">
                                  Tipo
                                </span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {truckType}
                                </span>
                              </div>
                            </div>

                            {/* CTG & loaded weight (set by balancero) */}
                            {tripCtg || loadedW != null ? (
                              <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2.5 rounded border border-slate-200 dark:border-zinc-800 space-y-1 text-slate-800 dark:text-zinc-200">
                                {tripCtg && (
                                  <div>
                                    CTG: <strong>{tripCtg}</strong>
                                  </div>
                                )}
                                {loadedW != null && (
                                  <div>
                                    Kilos cargados:{" "}
                                    <strong>
                                      {Number(loadedW).toLocaleString("es-AR")}{" "}
                                      kg
                                    </strong>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {/* Unloaded weight if completed */}
                            {isTripCompleted && (
                              <div className="space-y-2">
                                {load.status !== "COMPLETED" ? (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold space-y-1">
                                    <p className="font-bold flex items-center gap-1.5">
                                      <CheckCircle
                                        size={14}
                                        className="text-emerald-600 shrink-0"
                                      />
                                      Llegada confirmada — en destino
                                    </p>
                                    <p className="opacity-90 leading-relaxed font-medium">
                                      Tu viaje ha finalizado con éxito. La carga se moverá a "Completados" y se habilitará para facturación cuando el resto de los camiones asignados lleguen a destino.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                                    <CheckCircle size={14} />
                                    Llegada confirmada — en destino
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Assigned: Carrier can only start if balancero/admin already loaded the CTG */}
                            {!isTripInProgress && !isTripCompleted && (
                              <div className="space-y-2">
                                {!tripCtg ? (
                                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                      <Clock size={14} className="shrink-0" />
                                      Esperando que el balancero u operador
                                      registre la Carta de Porte (CTG) en
                                      báscula.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    {isCarrier || canUserWrite ? (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        icon={Send}
                                        className="w-full font-bold"
                                        onClick={() => {
                                          setActiveAppId(trip.id);
                                          setShowStartTripModal(true);
                                        }}
                                      >
                                        Iniciar Viaje
                                      </Button>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">
                                        Carta de Porte (CTG) cargada. Esperando
                                        que el transportista inicie el viaje.
                                      </p>
                                    )}
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={XCircle}
                                  className="w-full border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold mt-2"
                                  onClick={() => {
                                    setCancelAppId(trip.id);
                                    setShowCancelAppModal(true);
                                  }}
                                >
                                  Cancelar Postulación / Viaje
                                </Button>
                              </div>
                            )}

                            {/* In progress: trip cannot be cancelled once started */}
                            {isTripInProgress &&
                              !isTripCompleted &&
                              (isCarrier || isLogistics) && (
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
          })()
        )}

        {/* Contingencies Timeline */}
        {!isBalancero && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              Historial de Contingencias y Novedades
            </h3>
            {!load.contingencies || load.contingencies.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No se registraron incidentes durante este traslado.
              </p>
            ) : (
              <div className="relative pl-6 border-l-2 border-slate-100 dark:border-zinc-800 space-y-6">
                {load.contingencies.map((c) => (
                  <div key={c.id} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-amber-500 rounded-full border-4 border-white dark:border-zinc-900" />
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                          Reportado por: {c.reportedBy}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium">
                        {c.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para Cancelación de Postulación con Motivo por Transportista */}
      <Modal
        isOpen={showCancelAppModal}
        onClose={() => {
          setShowCancelAppModal(false);
          setCancelAppId(null);
          setCancelReason("");
        }}
        onConfirm={async () => {
          if (!cancelAppId || !cancelReason.trim()) {
            alert("Por favor ingrese el motivo de la cancelación.");
            return;
          }
          if (onCancelApplication) {
            setLocalSubmitLoading(true);
            try {
              const ok = await onCancelApplication(
                cancelAppId,
                cancelReason.trim(),
              );
              if (ok) {
                setShowCancelAppModal(false);
                setCancelAppId(null);
                setCancelReason("");
              }
            } finally {
              setLocalSubmitLoading(false);
            }
          }
        }}
        title={isCarrier ? "Cancelar Postulación / Viaje" : "Rechazar Postulación"}
        description={
          isCarrier
            ? "Por favor, especifica el motivo por el cual necesitas cancelar esta postulación. El sistema liberará el cupo y notificará a la administración."
            : "Por favor, especifica el motivo por el cual rechazas esta postulación."
        }
        type="danger"
        confirmText={isCarrier ? "Confirmar Cancelación" : "Confirmar Rechazo"}
        isLoading={localSubmitLoading}
      >
        <div className="space-y-4 pt-2">
          <Input
            label={isCarrier ? "Motivo de la Cancelación (Obligatorio)" : "Motivo del Rechazo (Obligatorio)"}
            placeholder={isCarrier ? "Ej: Se rompió el camión en la ruta / Problema mecánico" : "Ej: Seguro vencido / Camión no apto"}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Modal para Iniciar Viaje por Transportista */}
      <Modal
        isOpen={showStartTripModal}
        onClose={() => {
          setShowStartTripModal(false);
          setActiveAppId(null);
        }}
        onConfirm={async () => {
          if (onStartTrip && activeAppId) {
            setLocalSubmitLoading(true);
            try {
              const ok = await onStartTrip(activeAppId);
              if (ok) {
                setShowStartTripModal(false);
                setActiveAppId(null);
              }
            } finally {
              setLocalSubmitLoading(false);
            }
          }
        }}
        title="Iniciar Viaje"
        description="¿Estás seguro de que deseas confirmar el inicio del viaje para este camión? El estado del traslado pasará a estar 'En Viaje'."
        type="info"
        confirmText="Confirmar Inicio"
        isLoading={localSubmitLoading}
      />
    </div>
  );
};

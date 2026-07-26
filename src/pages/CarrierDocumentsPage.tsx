import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  carrierDocumentSchema,
  type CarrierDocumentFormValues,
} from "../schemas/carrier-document.schema";
import { carrierDocumentService, carrierService } from "../api/services";
import { type CarrierDocument, type Carrier } from "../types";
import { getErrorMessage } from "../api/errorUtils";
import { useAuthStore } from "../store/useAuthStore";
import { useToast } from "../hooks/useToast";
import { Toast } from "../components/ui/Toast";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import {
  FileText,
  Check,
  X,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  Building,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { ImageUpload } from "../components/ui/ImageUpload";

const CURRENT_TIME = Date.now();

export const CarrierDocumentsPage: React.FC = () => {
  const isAdmin = useAuthStore((state) => state.isAdmin());

  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const { toast, showToast, hideToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<CarrierDocumentFormValues>({
    resolver: zodResolver(carrierDocumentSchema),
    mode: "onChange",
    defaultValues: {
      expirationDate: "",
      fileUrl: "",
    },
  });

  const loadData = async () => {
    try {
      const docsRes = await carrierDocumentService.getDocuments();
      if (docsRes.data.success) {
        setDocuments(docsRes.data.data);
      }
      if (isAdmin) {
        const carriersRes = await carrierService.getCarriers();
        if (carriersRes.data.success) {
          setCarriers(carriersRes.data.data);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar la información de documentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const docsRes = await carrierDocumentService.getDocuments();
        if (active && docsRes.data.success) {
          setDocuments(docsRes.data.data);
        }
        if (active && isAdmin) {
          const carriersRes = await carrierService.getCarriers();
          if (active && carriersRes.data.success) {
            setCarriers(carriersRes.data.data);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) setError("Error al cargar la información de documentos.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Handle load data effect

  const onSubmit = async (data: CarrierDocumentFormValues) => {
    setSubmitLoading(true);
    setError("");
    try {
      const res = await carrierDocumentService.createDocument({
        type: "SEGURO_CARGA",
        fileUrl: data.fileUrl,
        expirationDate: new Date(data.expirationDate).toISOString(),
      });

      if (res.data.success) {
        showToast(
          "Póliza de seguro cargada correctamente. Queda pendiente de aprobación.",
          "success",
        );
        reset();
        setLoading(true);
        loadData();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Error al subir el documento."));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAudit = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await carrierDocumentService.updateDocument(id, { status });
      if (res.data.success) {
        showToast(
          status === "APPROVED" ? "Póliza aprobada" : "Póliza rechazada",
          "success",
        );
        setLoading(true);
        loadData();
      }
    } catch (err) {
      console.error(err);
      showToast("Error al actualizar el estado de la póliza.", "error");
    }
  };

  const getStatusLabelAndColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          label: "Aprobado",
          bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900",
          badge: "success" as const,
        };
      case "PENDING":
        return {
          label: "Pendiente",
          bg: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900",
          badge: "warning" as const,
        };
      case "REJECTED":
        return {
          label: "Rechazado",
          bg: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900",
          badge: "error" as const,
        };
      case "EXPIRED":
        return {
          label: "Vencido",
          bg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
          badge: "neutral" as const,
        };
      default:
        return {
          label: "Desconocido",
          bg: "bg-slate-100 text-slate-700",
          badge: "neutral" as const,
        };
    }
  };

  // Filter carrier documents to show latest policy status
  const carrierDocs = documents.filter((d) => d.type === "SEGURO_CARGA");
  const latestDoc =
    carrierDocs.length > 0
      ? [...carrierDocs].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]
      : null;

  const isExpired =
    latestDoc && new Date(latestDoc.expirationDate).getTime() <= CURRENT_TIME;
  const policyStatus = latestDoc
    ? isExpired
      ? "EXPIRED"
      : latestDoc.status
    : "MISSING";

  // Admin columns
  const adminColumns = [
    {
      header: "Transportista",
      render: (doc: CarrierDocument) => {
        const carrierName =
          carriers.find((c) => c.id === doc.carrierId)?.name ||
          `ID: ${doc.carrierId}`;
        return (
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building size={16} className="text-slate-400" />
            {carrierName}
          </span>
        );
      },
    },
    {
      header: "Vencimiento",
      render: (doc: CarrierDocument) => {
        const isDocExpired =
          new Date(doc.expirationDate).getTime() <= CURRENT_TIME;
        return (
          <span
            className={`font-semibold flex items-center gap-1.5 ${isDocExpired ? "text-rose-500 font-bold" : "text-slate-700 dark:text-zinc-300"}`}
          >
            <Calendar size={14} className="opacity-60" />
            {new Date(doc.expirationDate).toLocaleDateString("es-AR")}
            {isDocExpired && (
              <span className="text-[10px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-md font-black uppercase">
                Vencido
              </span>
            )}
          </span>
        );
      },
    },
    {
      header: "Estado",
      render: (doc: CarrierDocument) => {
        const isDocExpired =
          new Date(doc.expirationDate).getTime() <= CURRENT_TIME;
        const stat = isDocExpired ? "EXPIRED" : doc.status;
        const details = getStatusLabelAndColor(stat);
        return (
          <Badge variant={details.badge}>{details.label.toUpperCase()}</Badge>
        );
      },
    },
    {
      header: "Documento",
      render: (doc: CarrierDocument) => (
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline flex items-center gap-1 text-sm font-bold"
        >
          <Download size={14} />
          Ver Archivo
        </a>
      ),
    },
    {
      header: "Acciones de Auditoría",
      className: "w-48 text-right",
      render: (doc: CarrierDocument) => {
        const isDocExpired =
          new Date(doc.expirationDate).getTime() <= CURRENT_TIME;
        if (doc.status !== "PENDING" || isDocExpired)
          return (
            <span className="text-xs text-slate-400 italic">
              Auditado / Vencido
            </span>
          );
        return (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              icon={Check}
              className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 font-bold"
              onClick={() => handleAudit(doc.id, "APPROVED")}
            >
              Aprobar
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={X}
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900 font-bold"
              onClick={() => handleAudit(doc.id, "REJECTED")}
            >
              Rechazar
            </Button>
          </div>
        );
      },
    },
  ];

  // Carrier history columns
  const carrierColumns = [
    {
      header: "Fecha de Carga",
      render: (doc: CarrierDocument) => (
        <span className="text-slate-600 dark:text-zinc-400 font-semibold">
          {new Date(doc.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
    {
      header: "Vencimiento de Póliza",
      render: (doc: CarrierDocument) => {
        const isDocExpired =
          new Date(doc.expirationDate).getTime() <= CURRENT_TIME;
        return (
          <span
            className={`font-semibold flex items-center gap-1.5 ${isDocExpired ? "text-rose-500 font-bold" : "text-slate-700 dark:text-zinc-300"}`}
          >
            <Calendar size={14} className="opacity-60" />
            {new Date(doc.expirationDate).toLocaleDateString("es-AR")}
          </span>
        );
      },
    },
    {
      header: "Estado de Aprobación",
      render: (doc: CarrierDocument) => {
        const isDocExpired =
          new Date(doc.expirationDate).getTime() <= CURRENT_TIME;
        const stat = isDocExpired ? "EXPIRED" : doc.status;
        const details = getStatusLabelAndColor(stat);
        return (
          <Badge variant={details.badge}>{details.label.toUpperCase()}</Badge>
        );
      },
    },
    {
      header: "Archivo",
      render: (doc: CarrierDocument) => (
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline flex items-center gap-1 text-sm font-bold"
        >
          <Download size={14} />
          Descargar
        </a>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
      />

      <PageHeader
        title={isAdmin ? "Auditoría de Seguros" : "Seguro de Carga"}
        description={
          isAdmin
            ? "Revisa y audita las pólizas de seguro de carga presentadas por las empresas transportistas."
            : "Administra y actualiza la póliza de seguro de tu empresa para mantener habilitadas tus postulaciones."
        }
        icon={FileText}
      />

      <ErrorMessage message={error} className="mb-4" />

      {isAdmin ? (
        // ================= ADMIN AUDIT VIEW =================
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Pólizas Presentadas
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-3 py-1 rounded-full font-bold">
              Total: {documents.length}
            </span>
          </div>
          <Table columns={adminColumns} data={documents} isLoading={loading} />
        </div>
      ) : (
        // ================= CARRIER MANAGEMENT VIEW =================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Policy Info & Upload Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                Estado del Seguro
              </h3>

              {policyStatus === "MISSING" && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-center">
                  <AlertTriangle
                    className="text-rose-500 mx-auto mb-2"
                    size={32}
                  />
                  <p className="font-bold text-rose-800 dark:text-rose-400 text-sm">
                    Sin póliza cargada
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">
                    Carga tu comprobante de seguro para poder postularte a
                    viajes.
                  </p>
                </div>
              )}

              {policyStatus === "PENDING" && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 text-center">
                  <Clock className="text-amber-500 mx-auto mb-2" size={32} />
                  <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">
                    Pendiente de Aprobación
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Un operador de la cooperativa está revisando tu póliza.
                  </p>
                </div>
              )}

              {policyStatus === "APPROVED" && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-center">
                  <CheckCircle2
                    className="text-emerald-500 mx-auto mb-2"
                    size={32}
                  />
                  <p className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">
                    Seguro Vigente y Aprobado
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                    Vence el:{" "}
                    {latestDoc
                      ? new Date(latestDoc.expirationDate).toLocaleDateString(
                          "es-AR",
                        )
                      : ""}
                  </p>
                </div>
              )}

              {policyStatus === "REJECTED" && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-center">
                  <X
                    className="text-rose-500 bg-rose-100 dark:bg-rose-900/50 p-1.5 rounded-full mx-auto mb-2"
                    size={32}
                  />
                  <p className="font-bold text-rose-800 dark:text-rose-400 text-sm">
                    Seguro Rechazado
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">
                    Tu póliza anterior fue rechazada. Por favor, sube una
                    correcta.
                  </p>
                </div>
              )}

              {policyStatus === "EXPIRED" && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-center">
                  <AlertCircle
                    className="text-rose-500 mx-auto mb-2"
                    size={32}
                  />
                  <p className="font-bold text-rose-800 dark:text-rose-400 text-sm">
                    Seguro Vencido
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">
                    Tu póliza venció el:{" "}
                    {latestDoc
                      ? new Date(latestDoc.expirationDate).toLocaleDateString(
                          "es-AR",
                        )
                      : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Upload Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                Actualizar Póliza
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Fecha de Vencimiento de la Póliza
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                      {...register("expirationDate")}
                    />
                  </div>
                  {errors.expirationDate && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.expirationDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Controller
                    control={control}
                    name="fileUrl"
                    render={({ field: { value, onChange } }) => (
                      <ImageUpload
                        label="Comprobante de Póliza (Img)"
                        value={value}
                        onChange={onChange}
                        error={errors.fileUrl?.message}
                      />
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  isLoading={submitLoading}
                  disabled={!isValid}
                >
                  Enviar a Revisión
                </Button>
              </form>
            </div>
          </div>

          {/* History Uploads Table */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Historial de Cargas
              </h3>
            </div>
            <Table
              columns={carrierColumns}
              data={documents}
              isLoading={loading}
              emptyMessage="No has subido ningún documento de póliza de seguro todavía."
            />
          </div>
        </div>
      )}
    </div>
  );
};

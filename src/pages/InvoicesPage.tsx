import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadService, invoiceService } from '../api/services';
import { type Load, type Invoice } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ImageUpload } from '../components/ui/ImageUpload';
import { Table } from '../components/ui/Table';
import { useAuthStore } from '../store/useAuthStore';
import { FileText, Plus, CheckCircle, Eye } from 'lucide-react';
import { getErrorMessage } from '../api/errorUtils';
import { useToast } from '../hooks/useToast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const user = useAuthStore((state) => state.user);
  const isCarrier = user?.role === 'CARRIER';
  const { toast, showToast, hideToast } = useToast();

  const [completedLoads, setCompletedLoads] = useState<Load[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedLoadIds, setSelectedLoadIds] = useState<(number | string)[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Invoice form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState('');
  const [error, setError] = useState('');

  const refreshData = async () => {
    setLoading(true);
    try {
      const [loadsRes, invoicesRes] = await Promise.all([
        loadService.getLoads({ status: 'COMPLETED' }),
        invoiceService.getInvoices()
      ]);

      if (loadsRes.data.success) {
        const unbilled = loadsRes.data.data.filter(l => l.status === 'COMPLETED' && !l.invoiceId);
        setCompletedLoads(unbilled);
      }

      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos de facturación', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useAutoRefresh(refreshData);

  useEffect(() => {
    let active = true;
    const fetchInvoice = async () => {
      if (!id) {
        if (active) setSelectedInvoice(null);
        return;
      }
      try {
        const res = await invoiceService.getInvoice(Number(id));
        if (active && res.data.success) {
          setSelectedInvoice(res.data.data);
        }
      } catch (err) {
        if (active) {
          console.error(err);
          showToast('Error al cargar la factura', 'error');
          navigate('/invoices');
        }
      }
    };
    fetchInvoice();
    return () => { active = false; };
  }, [id, navigate]);

  const handleSelectLoad = (id: number | string) => {
    setSelectedLoadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };


  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoadIds.length === 0) {
      setError('Debe seleccionar al menos un viaje completado.');
      return;
    }
    if (!invoiceNumber && !invoicePhotoUrl) {
      setError('Debe ingresar el número de factura o adjuntar la imagen del comprobante.');
      return;
    }

    setSubmitLoading(true);
    setError('');
    try {
      const res = await invoiceService.createInvoice({
        number: invoiceNumber || undefined,
        fileUrl: invoicePhotoUrl || undefined,
        invoiceNumber: invoiceNumber || undefined,
        invoicePhotoUrl: invoicePhotoUrl || undefined,
        loadIds: selectedLoadIds
      });

      if (res.data.success) {
        showToast('Factura registrada con éxito', 'success');
        setInvoiceNumber('');
        setInvoicePhotoUrl('');
        setSelectedLoadIds([]);
        setShowCreateForm(false);
        refreshData();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al registrar la factura.'));
    } finally {
      setSubmitLoading(false);
    }
  };


  // Columns for unbilled loads
  const unbilledColumns = [
    {
      header: 'Seleccionar',
      render: (l: Load) => (
        <input 
          type="checkbox" 
          checked={selectedLoadIds.includes(l.id)}
          onChange={() => handleSelectLoad(l.id)}
          className="rounded border-slate-350 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
        />
      )
    },
    {
      header: 'Viaje (Origen → Destino)',
      render: (l: Load) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-zinc-200">{l.origin} → {l.destination}</span>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">Cereal: {l.cereal || 'N/D'}</span>
        </div>
      )
    },
    {
      header: 'Fecha',
      render: (l: Load) => (
        <span className="text-xs text-slate-600 dark:text-zinc-400 font-semibold font-mono">
          {l.loadingDate ? new Date(l.loadingDate).toLocaleDateString('es-AR') : new Date(l.date).toLocaleDateString('es-AR')}
        </span>
      )
    },
    {
      header: 'Pesaje Carga/Descarga',
      render: (l: Load) => (
        <div className="flex flex-col text-xs font-mono text-slate-500 dark:text-zinc-400">
          <span>Cargado: {l.loadedWeight ? `${l.loadedWeight.toLocaleString()} kg` : 'N/D'}</span>
          <span>Descargado: {l.unloadedWeight ? `${l.unloadedWeight.toLocaleString()} kg` : 'N/D'}</span>
        </div>
      )
    },
    {
      header: 'Tarifa',
      render: (l: Load) => (
        <span className="font-black text-slate-850 dark:text-white font-mono">
          ${Number(l.rate).toLocaleString('es-AR')}
        </span>
      )
    }
  ];

  // Columns for generated invoices
  const invoiceColumns = [
    {
      header: 'Número de Factura',
      render: (inv: Invoice) => (
        <span className="font-bold text-slate-800 dark:text-zinc-200">
          {inv.invoiceNumber || `Factura #${inv.id}`}
        </span>
      )
    },
    {
      header: 'Fecha de Registro',
      render: (inv: Invoice) => (
        <span className="text-xs text-slate-500 font-semibold font-mono">
          {new Date(inv.createdAt).toLocaleDateString('es-AR')}
        </span>
      )
    },
    {
      header: 'Viajes Asoc.',
      render: (inv: Invoice) => (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
          {inv.loadIds.length} viajes
        </span>
      )
    },
    {
      header: 'Factura Adjunta',
      render: (inv: Invoice) => (
        <a 
          href={inv.invoicePhotoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 hover:text-emerald-500 flex items-center gap-1 font-bold underline"
        >
          <Eye size={14} /> Ver Factura
        </a>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Facturación Global" 
        description="Agrupe múltiples viajes finalizados y cargue su factura para cobrar." 
      />

      {isCarrier && (
        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <span className="text-sm font-semibold text-slate-500">Viajes completados pendientes de facturación</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-zinc-200 mt-0.5">
              {completedLoads.length} viajes por facturar
            </h3>
          </div>
          {completedLoads.length > 0 && (
            <Button 
              variant="primary" 
              icon={Plus} 
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setError('');
              }}
            >
              {showCreateForm ? 'Cerrar Formulario' : 'Facturar Selección'}
            </Button>
          )}
        </div>
      )}

      {showCreateForm && isCarrier && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-emerald-600" />
            Nueva Factura Global
          </h3>

          <form onSubmit={handleSubmitInvoice} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/30 text-sm font-semibold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input 
                  label="Número de Factura (Opcional)" 
                  placeholder="Ej: A-0001-00000123"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
                
                <div className="p-4 bg-slate-50 dark:bg-zinc-850/50 rounded-xl border border-slate-200/50 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-400 block uppercase mb-2">Viajes Seleccionados ({selectedLoadIds.length})</span>
                  {selectedLoadIds.length === 0 ? (
                    <span className="text-sm text-slate-500 italic block">Seleccione los viajes en la tabla inferior.</span>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {completedLoads.filter(l => selectedLoadIds.includes(l.id)).map(l => (
                        <div key={l.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-900 p-2 rounded border border-slate-100 dark:border-zinc-800">
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">{l.origin} → {l.destination}</span>
                          <span className="font-bold text-slate-900 dark:text-white">${Number(l.rate).toLocaleString('es-AR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <ImageUpload 
                  label="Foto o Imagen de la Factura *"
                  value={invoicePhotoUrl}
                  onChange={setInvoicePhotoUrl}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submitLoading} disabled={selectedLoadIds.length === 0 || !invoicePhotoUrl} icon={CheckCircle}>
                Enviar Factura
              </Button>
            </div>
          </form>
        </div>
      )}

      {isCarrier && completedLoads.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
          <h3 className="text-md font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            1. Seleccionar viajes a facturar
          </h3>
          <Table 
            columns={unbilledColumns}
            data={completedLoads}
            isLoading={loading}
          />
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
        <h3 className="text-md font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
          Historial de Facturas Enviadas
        </h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 text-center">No se han registrado facturas globales.</p>
        ) : (
          <Table 
            columns={invoiceColumns}
            data={invoices}
            isLoading={loading}
            onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
          />
        )}
      </div>

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => navigate('/invoices')}
        title="Detalles de Factura"
        type="info"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="flex flex-col border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Número</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-lg">
                {selectedInvoice.invoiceNumber || `Factura #${selectedInvoice.id}`}
              </span>
            </div>
            <div className="flex flex-col border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Fecha de Registro</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {new Date(selectedInvoice.createdAt).toLocaleDateString('es-AR')}
              </span>
            </div>
            <div className="flex flex-col border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Viajes Asociados</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {selectedInvoice.loadIds?.length || 0} viajes
              </span>
            </div>
            {selectedInvoice.invoicePhotoUrl && (
              <div className="pt-2">
                <a 
                  href={selectedInvoice.invoicePhotoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Eye size={18} /> Ver Comprobante
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />}
    </div>
  );
};

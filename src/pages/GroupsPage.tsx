import React, { useState, useEffect, useCallback } from 'react';
import { groupService, carrierService } from '../api/services';
import { type CarrierGroup, type Carrier } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { Table } from '../components/ui/Table';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import {
  ChevronLeft, Plus, Trash2, UserPlus, UserMinus,
  Building, Briefcase, Search, RefreshCw, Save, Users
} from 'lucide-react';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<CarrierGroup[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation View State: 'LIST' | 'FORM'
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');

  // Form & Member Management State
  const [editingGroup, setEditingGroup] = useState<CarrierGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [selectedCarrierToAdd, setSelectedCarrierToAdd] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingCarrierId, setRemovingCarrierId] = useState<number | null>(null);

  const { toast, showToast, hideToast } = useToast();
  const { isOpen: isDelOpen, data: delGroup, ask: askDelete, confirm: confirmDelete, cancel: cancelDelete } = useConfirm<CarrierGroup>();

  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupService.getGroups();
      if (res.data.success && res.data.data) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de grupos de transportistas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCarriers = useCallback(async () => {
    try {
      const res = await carrierService.getCarriers();
      if (res.data.success && res.data.data) {
        setCarriers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching carriers', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      if (!active) return;
      await Promise.all([fetchGroups(), fetchCarriers()]);
    };

    loadInitialData();
    return () => {
      active = false;
    };
  }, [fetchGroups, fetchCarriers]);

  // Open create group view
  const handleOpenCreate = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDescription('');
    setSelectedCarrierToAdd('');
    setViewMode('FORM');
  };

  // Open edit group view & load details
  const handleOpenEdit = async (group: CarrierGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setSelectedCarrierToAdd('');
    setViewMode('FORM');
    setGroupDetailsLoading(true);

    try {
      const res = await groupService.getGroup(group.id);
      if (res.data.success && res.data.data) {
        setEditingGroup(res.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar integrantes del grupo.', 'error');
    } finally {
      setGroupDetailsLoading(false);
    }
  };

  // Return to group list view
  const handleBackToList = () => {
    setViewMode('LIST');
    setEditingGroup(null);
    fetchGroups();
  };

  // Save group info (Create or Update)
  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    setFormSubmitting(true);
    try {
      if (editingGroup) {
        const res = await groupService.updateGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDescription.trim() || undefined
        });
        if (res.data.success) {
          showToast('Nombre y descripción actualizados con éxito');
          fetchGroups();
        }
      } else {
        const res = await groupService.createGroup({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined
        });
        if (res.data.success && res.data.data) {
          const createdGroup = res.data.data;
          showToast('Grupo creado con éxito. Ahora puedes asignar transportistas.');
          fetchGroups();
          // Transition into edit & member management mode directly
          setEditingGroup(createdGroup);
          const detailRes = await groupService.getGroup(createdGroup.id);
          if (detailRes.data.success && detailRes.data.data) {
            setEditingGroup(detailRes.data.data);
          }
        }
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al guardar el grupo.'), 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async () => {
    if (!delGroup) return;
    if (delGroup._count?.loads && delGroup._count.loads > 0) {
      showToast('No se puede eliminar un grupo que tiene cargas activas asignadas.', 'error');
      cancelDelete();
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await groupService.deleteGroup(delGroup.id);
      if (res.data.success) {
        showToast('Grupo eliminado con éxito');
        confirmDelete();
        fetchGroups();
        if (viewMode === 'FORM') {
          setViewMode('LIST');
          setEditingGroup(null);
        }
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al eliminar el grupo. Compruebe si tiene cargas asignadas.'), 'error');
      cancelDelete();
    } finally {
      setFormSubmitting(false);
    }
  };

  // Add carrier to group
  const handleAddCarrier = async () => {
    if (!editingGroup || !selectedCarrierToAdd) return;
    setIsAddingMember(true);
    try {
      const res = await groupService.addCarrierToGroup(editingGroup.id, Number(selectedCarrierToAdd));
      if (res.data.success) {
        showToast('Transportista asignado al grupo con éxito');
        setSelectedCarrierToAdd('');
        // Refresh group detail
        const groupRes = await groupService.getGroup(editingGroup.id);
        if (groupRes.data.success && groupRes.data.data) {
          setEditingGroup(groupRes.data.data);
        }
        fetchGroups();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al asignar transportista al grupo.'), 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove carrier from group
  const handleRemoveCarrier = async (carrierId: number) => {
    if (!editingGroup) return;
    setRemovingCarrierId(carrierId);
    try {
      const res = await groupService.removeCarrierFromGroup(editingGroup.id, carrierId);
      if (res.data.success) {
        showToast(res.data.message || 'Transportista removido del grupo exitosamente');
        // Refresh group detail
        const groupRes = await groupService.getGroup(editingGroup.id);
        if (groupRes.data.success && groupRes.data.data) {
          setEditingGroup(groupRes.data.data);
        }
        fetchGroups();
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al remover transportista.'), 'error');
    } finally {
      setRemovingCarrierId(null);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    {
      header: 'Nombre del Grupo',
      render: (g: CarrierGroup) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white text-base">{g.name}</span>
          {g.description && (
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{g.description}</span>
          )}
        </div>
      )
    },
    {
      header: 'Transportistas Integrantes',
      render: (g: CarrierGroup) => {
        const count = g._count?.carriers ?? g.carriers?.length ?? 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-full border border-emerald-200/50 dark:border-emerald-800/30">
            <Building size={14} />
            {count} {count === 1 ? 'empresa' : 'empresas'}
          </span>
        );
      }
    },
    {
      header: 'Cargas Asignadas',
      render: (g: CarrierGroup) => {
        const count = g._count?.loads ?? 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-200/50 dark:border-blue-800/30">
            <Briefcase size={14} />
            {count} {count === 1 ? 'carga' : 'cargas'}
          </span>
        );
      }
    },
    {
      header: 'Acciones',
      className: 'w-24 text-right',
      render: (g: CarrierGroup) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            iconClassName="text-rose-500"
            onClick={() => askDelete(g)}
            title="Eliminar grupo"
          />
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      {/* Delete Group Confirmation Modal */}
      <Modal
        isOpen={isDelOpen}
        onClose={cancelDelete}
        onConfirm={handleDeleteGroup}
        title="Eliminar Grupo"
        description={
          delGroup?._count?.loads && delGroup._count.loads > 0
            ? `⚠️ Este grupo tiene ${delGroup._count.loads} carga(s) asignadas. No se puede eliminar.`
            : `¿Estás seguro de que deseas eliminar el grupo "${delGroup?.name}"? Esta acción no se puede deshacer.`
        }
        type="danger"
        confirmText="Eliminar"
        isLoading={formSubmitting}
        isConfirmDisabled={Boolean(delGroup?._count?.loads && delGroup._count.loads > 0)}
      />

      {viewMode === 'FORM' ? (
        /* --- FORM / EDIT VIEW --- */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              icon={ChevronLeft}
              onClick={handleBackToList}
              className="text-xs"
            >
              Volver a Grupos
            </Button>
            {editingGroup && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => askDelete(editingGroup)}
                className="text-xs"
              >
                Eliminar Grupo
              </Button>
            )}
          </div>

          {/* Group Header Hero Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                {editingGroup ? (groupName || editingGroup.name) : (groupName.trim() || 'Nuevo Grupo de Transportistas')}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-8">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                  Información Principal
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Nombre del Grupo *"
                  placeholder="Ej: Bateas, Chasis, Cerealeros, etc."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="py-2.5"
                />
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
                    placeholder="Ej: Transportistas habilitados para transporte de cereales a granel..."
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  icon={Save}
                  onClick={handleSaveGroup}
                  isLoading={formSubmitting}
                  disabled={!groupName.trim() || formSubmitting}
                  className="px-6"
                >
                  {editingGroup ? 'Guardar Cambios' : 'Crear y Continuar a Integrantes'}
                </Button>
              </div>
            </div>

            {/* Section 2: Manage Members (Visible when editingGroup is active) */}
            {editingGroup && (
              <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                      Transportistas Integrantes ({editingGroup.carriers?.length || 0})
                    </h3>
                  </div>
                </div>

                {groupDetailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="animate-spin text-emerald-500" size={24} />
                  </div>
                ) : (
                  <>
                    {/* Add Carrier Form */}
                    <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800 space-y-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                        Asignar Nuevo Transportista
                      </span>
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                        <div className="flex-1 w-full">
                          <Select
                            label=""
                            icon={Building}
                            options={carriers
                              .filter(c => !editingGroup.carriers?.some(m => m.carrierId === c.id))
                              .map(c => ({ value: String(c.id), label: `${c.name} (${c.cuit})` }))
                            }
                            value={selectedCarrierToAdd}
                            onChange={(e) => setSelectedCarrierToAdd(e.target.value)}
                          />
                        </div>
                        <Button
                          variant="primary"
                          icon={UserPlus}
                          onClick={handleAddCarrier}
                          disabled={!selectedCarrierToAdd || isAddingMember || removingCarrierId !== null}
                          isLoading={isAddingMember}
                          className="w-full sm:w-auto whitespace-nowrap justify-center"
                        >
                          Asignar al Grupo
                        </Button>
                      </div>
                    </div>

                    {/* Member Carriers List */}
                    {!editingGroup.carriers || editingGroup.carriers.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-zinc-500 italic p-6 text-center bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                        Este grupo aún no tiene transportistas asignados. Utiliza el selector superior para añadir el primero.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {editingGroup.carriers.map((member) => (
                          <div
                            key={member.carrierId}
                            className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                                <Building size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">
                                  {member.carrier?.name || `Transportista #${member.carrierId}`}
                                </p>
                                {member.carrier?.cuit && (
                                  <p className="text-xs text-slate-400 font-mono">CUIT: {member.carrier.cuit}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              onClick={() => handleRemoveCarrier(member.carrierId)}
                              isLoading={removingCarrierId === member.carrierId}
                              disabled={isAddingMember || (removingCarrierId !== null && removingCarrierId !== member.carrierId)}
                              icon={UserMinus}
                              className="shrink-0 !px-3 !py-1.5 text-xs whitespace-nowrap"
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- LIST VIEW --- */
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <PageHeader
              title="Grupos de Transportistas"
              description="Segmenta y administra grupos personalizados para publicaciones dirigidas y tarifas diferenciadas."
            />
            <Button variant="primary" icon={Plus} onClick={handleOpenCreate} className="w-full md:w-auto px-6">
              Nuevo Grupo
            </Button>
          </div>

          <ErrorMessage message={error} />

          {/* Search Filter */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="relative w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar grupo por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={fetchGroups}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Groups Table */}
          <Table
            columns={columns}
            data={filteredGroups}
            isLoading={loading}
            emptyMessage="No se encontraron grupos de transportistas registrados."
            onRowClick={(g) => handleOpenEdit(g)}
          />
        </div>
      )}
    </div>
  );
};

export default GroupsPage;

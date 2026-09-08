import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { groupService, carrierService, authService } from "../api/services";
import {
  type CarrierGroup,
  type Carrier,
  type User,
  type GroupMemberType,
  type GroupMember,
} from "../types";
import { Badge } from "../components/ui/Badge";
import { getErrorMessage } from "../api/errorUtils";
import { Table } from "../components/ui/Table";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { Toast } from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useConfirm } from "../hooks/useConfirm";
import {
  ChevronLeft,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  Building,
  Briefcase,
  Search,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";

export const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [groups, setGroups] = useState<CarrierGroup[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [logisticsUsers, setLogisticsUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Navigation View State: 'LIST' | 'FORM'
  const [viewMode, setViewMode] = useState<"LIST" | "FORM">("LIST");

  // Form & Member Management State
  const [editingGroup, setEditingGroup] = useState<CarrierGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
  const [selectedMemberType, setSelectedMemberType] =
    useState<GroupMemberType>("carrier");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const { toast, showToast, hideToast } = useToast();
  const {
    isOpen: isDelOpen,
    data: delGroup,
    ask: askDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirm<CarrierGroup>();

  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupService.getGroups();
      if (res.data.success && res.data.data) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar la lista de grupos de transportistas.");
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
      console.error("Error fetching carriers", err);
    }
  }, []);

  const fetchLogisticsUsers = useCallback(async () => {
    try {
      const res = await authService.getUsers();
      if (res.data.success && res.data.data) {
        setLogisticsUsers(
          res.data.data.filter((u: User) => u.role === "LOGISTICS"),
        );
      }
    } catch (err) {
      console.error("Error fetching logistics users", err);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    await Promise.all([fetchGroups(), fetchCarriers(), fetchLogisticsUsers()]);
  }, [fetchGroups, fetchCarriers, fetchLogisticsUsers]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useAutoRefresh(loadInitialData);

  useEffect(() => {
    let active = true;
    const loadSelectedGroup = async () => {
      if (!id) {
        if (active) {
          setViewMode("LIST");
          setEditingGroup(null);
        }
        return;
      }
      setGroupDetailsLoading(true);
      try {
        const res = await groupService.getGroup(Number(id));
        if (active && res.data.success && res.data.data) {
          const group = res.data.data;
          setEditingGroup(group);
          setGroupName(group.name);
          setGroupDescription(group.description || "");
          setSelectedMemberToAdd("");
          setSelectedMemberType("carrier");
          setViewMode("FORM");
        }
      } catch (err) {
        console.error(err);
        if (active)
          showToast("Error al cargar integrantes del grupo.", "error");
      } finally {
        if (active) setGroupDetailsLoading(false);
      }
    };
    loadSelectedGroup();
    return () => {
      active = false;
    };
  }, [id, showToast]);

  // Open create group view
  const handleOpenCreate = () => {
    if (id) {
      navigate("/groups");
    }
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setSelectedMemberToAdd("");
    setSelectedMemberType("carrier");
    setViewMode("FORM");
  };

  // Open edit group view & load details
  const handleOpenEdit = async (group: CarrierGroup) => {
    navigate(`/groups/${group.id}`);
  };

  // Return to group list view
  const handleBackToList = () => {
    if (id) {
      navigate("/groups");
    } else {
      setViewMode("LIST");
      setEditingGroup(null);
      fetchGroups();
    }
  };

  // Save group info (Create or Update)
  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    setFormSubmitting(true);
    try {
      if (editingGroup) {
        const res = await groupService.updateGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
        });
        if (res.data.success) {
          showToast("Nombre y descripción actualizados con éxito");
          fetchGroups();
        }
      } else {
        const res = await groupService.createGroup({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
        });
        if (res.data.success && res.data.data) {
          const createdGroup = res.data.data;
          showToast(
            "Grupo creado con éxito. Ahora puedes asignar transportistas.",
          );
          fetchGroups();
          // Transition into edit & member management mode directly
          setEditingGroup(createdGroup);
          const detailRes = await groupService.getGroup(createdGroup.id);
          if (detailRes.data.success && detailRes.data.data) {
            setEditingGroup(detailRes.data.data);
          }
          navigate(`/groups/${createdGroup.id}`);
        }
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el grupo."), "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async () => {
    if (!delGroup) return;
    if (delGroup._count?.loads && delGroup._count.loads > 0) {
      showToast(
        "No se puede eliminar un grupo que tiene cargas activas asignadas.",
        "error",
      );
      cancelDelete();
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await groupService.deleteGroup(delGroup.id);
      if (res.data.success) {
        showToast("Grupo eliminado con éxito");
        confirmDelete();
        fetchGroups();
        if (id) {
          navigate("/groups");
        } else if (viewMode === "FORM") {
          setViewMode("LIST");
          setEditingGroup(null);
        }
      }
    } catch (err) {
      showToast(
        getErrorMessage(
          err,
          "Error al eliminar el grupo. Compruebe si tiene cargas asignadas.",
        ),
        "error",
      );
      cancelDelete();
    } finally {
      setFormSubmitting(false);
    }
  };

  // Add member to group (carrier or logistics)
  const handleAddMember = async () => {
    if (!editingGroup || !selectedMemberToAdd) return;
    setIsAddingMember(true);
    try {
      const res = await groupService.addMemberToGroup(
        editingGroup.id,
        Number(selectedMemberToAdd),
        selectedMemberType,
      );
      if (res.data.success) {
        showToast(
          `${selectedMemberType === "carrier" ? "Transportista" : "Logística"} asignado al grupo con éxito`,
        );
        setSelectedMemberToAdd("");
        // Refresh group detail
        const groupRes = await groupService.getGroup(editingGroup.id);
        if (groupRes.data.success && groupRes.data.data) {
          setEditingGroup(groupRes.data.data);
        }
        fetchGroups();
      }
    } catch (err) {
      showToast(
        getErrorMessage(err, "Error al asignar integrante al grupo."),
        "error",
      );
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove member from group
  const handleRemoveMember = async (
    memberId: number,
    memberType: GroupMemberType,
  ) => {
    if (!editingGroup) return;
    const key = `${memberType}-${memberId}`;
    setRemovingMemberId(key);
    try {
      const res = await groupService.removeMemberFromGroup(
        editingGroup.id,
        memberId,
        memberType,
      );
      if (res.data.success) {
        showToast(
          res.data.message || "Integrante removido del grupo exitosamente",
        );
        // Refresh group detail
        const groupRes = await groupService.getGroup(editingGroup.id);
        if (groupRes.data.success && groupRes.data.data) {
          setEditingGroup(groupRes.data.data);
        }
        fetchGroups();
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Error al remover integrante."), "error");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.description &&
        g.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const columns = [
    {
      header: "Nombre del Grupo",
      render: (g: CarrierGroup) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white text-base">
            {g.name}
          </span>
          {g.description && (
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {g.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Integrantes",
      render: (g: CarrierGroup) => {
        const count =
          g._count?.members ??
          g._count?.carriers ??
          g.members?.length ??
          g.carriers?.length ??
          0;
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-full border border-emerald-200/50 dark:border-emerald-800/30">
            <Building size={14} />
            {count} {count === 1 ? "integrante" : "integrantes"}
          </span>
        );
      },
    },
    {
      header: "Cargas Asignadas",
      render: (g: CarrierGroup) => {
        const count = g._count?.loads ?? 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-200/50 dark:border-blue-800/30">
            <Briefcase size={14} />
            {count} {count === 1 ? "carga" : "cargas"}
          </span>
        );
      },
    },
    {
      header: "Acciones",
      className: "w-24 text-right",
      render: (g: CarrierGroup) => (
        <div
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            iconClassName="text-rose-500"
            onClick={() => askDelete(g)}
            title="Eliminar grupo"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
      />

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
        isConfirmDisabled={Boolean(
          delGroup?._count?.loads && delGroup._count.loads > 0,
        )}
      />

      {viewMode === "FORM" ? (
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                {editingGroup ? "Editar Grupo" : "Nuevo Grupo"}
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                {editingGroup
                  ? groupName || editingGroup.name
                  : groupName.trim() || "Nuevo Grupo de Transportistas"}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-8">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <Users
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400"
                />
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
                    className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
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
                  className="w-full sm:w-auto px-6 justify-center"
                >
                  {editingGroup
                    ? "Guardar Cambios"
                    : "Crear y Continuar a Integrantes"}
                </Button>
              </div>
            </div>

            {/* Section 2: Manage Members (Visible when editingGroup is active) */}
            {editingGroup && (
              <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building
                      size={18}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                    <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                      Integrantes (
                      {
                        (editingGroup.members || editingGroup.carriers || [])
                          .length
                      }
                      )
                    </h3>
                  </div>
                </div>

                {groupDetailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw
                      className="animate-spin text-emerald-500"
                      size={24}
                    />
                  </div>
                ) : (
                  <>
                    {/* Add Member Form */}
                    <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-zinc-800 space-y-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                        Asignar Nuevo Integrante
                      </span>

                      {/* Member Type Toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMemberType("carrier");
                            setSelectedMemberToAdd("");
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-bold rounded-md border transition-all ${
                            selectedMemberType === "carrier"
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-emerald-400"
                          }`}
                        >
                          Transportista
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMemberType("logistics");
                            setSelectedMemberToAdd("");
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-bold rounded-md border transition-all ${
                            selectedMemberType === "logistics"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-blue-400"
                          }`}
                        >
                          Logística
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                        <div className="flex-1 w-full">
                          <Select
                            label=""
                            icon={Building}
                            options={
                              selectedMemberType === "carrier"
                                ? carriers
                                    .filter((c) => {
                                      const members =
                                        editingGroup.members || [];
                                      const legacyCarriers =
                                        editingGroup.carriers || [];
                                      return (
                                        !members.some(
                                          (m) =>
                                            m.member_type === "carrier" &&
                                            m.id === c.id,
                                        ) &&
                                        !legacyCarriers.some(
                                          (m) => m.carrierId === c.id,
                                        )
                                      );
                                    })
                                    .map((c) => ({
                                      value: String(c.id),
                                      label: `${c.name} (${c.cuit})`,
                                    }))
                                : logisticsUsers
                                    .filter((u) => {
                                      const members =
                                        editingGroup.members || [];
                                      return !members.some(
                                        (m) =>
                                          m.member_type === "logistics" &&
                                          m.id === u.id,
                                      );
                                    })
                                    .map((u) => ({
                                      value: String(u.id),
                                      label: `${u.name} (${u.email})`,
                                    }))
                            }
                            value={selectedMemberToAdd}
                            onChange={(e) =>
                              setSelectedMemberToAdd(e.target.value)
                            }
                          />
                        </div>
                        <Button
                          variant="primary"
                          icon={UserPlus}
                          onClick={handleAddMember}
                          disabled={
                            !selectedMemberToAdd ||
                            isAddingMember ||
                            removingMemberId !== null
                          }
                          isLoading={isAddingMember}
                          className="w-full sm:w-auto whitespace-nowrap justify-center"
                        >
                          Asignar al Grupo
                        </Button>
                      </div>
                    </div>

                    {/* Members List */}
                    {(() => {
                      // Use members array if available, fall back to carriers
                      const membersList: GroupMember[] = editingGroup.members
                        ? editingGroup.members
                        : (editingGroup.carriers || []).map((c) => ({
                            id: c.carrier?.id || c.carrierId,
                            member_type: "carrier" as GroupMemberType,
                            name:
                              c.carrier?.name ||
                              `Transportista #${c.carrierId}`,
                            cuit: c.carrier?.cuit,
                          }));

                      if (membersList.length === 0) {
                        return (
                          <p className="text-sm text-slate-500 dark:text-zinc-500 italic p-6 text-center bg-slate-50 dark:bg-zinc-900/40 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800">
                            Este grupo aún no tiene integrantes asignados.
                            Utiliza el selector superior para añadir el primero.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2.5">
                          {membersList.map((member) => {
                            const key = `${member.member_type}-${member.id}`;
                            return (
                              <div
                                key={key}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 transition-all shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-3 min-w-0 flex-1 w-full">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div
                                      className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                                        member.member_type === "carrier"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      }`}
                                    >
                                      <Building size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 break-words">
                                        {member.name}
                                      </p>
                                      {member.cuit && (
                                        <p className="text-xs text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                          CUIT: {member.cuit}
                                        </p>
                                      )}
                                      {member.email && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          {member.email}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      member.member_type === "carrier"
                                        ? "success"
                                        : "info"
                                    }
                                    size="xs"
                                    className="shrink-0 mt-0.5"
                                  >
                                    {member.member_type === "carrier"
                                      ? "Transportista"
                                      : "Logística"}
                                  </Badge>
                                </div>
                                <Button
                                  variant="danger"
                                  onClick={() =>
                                    handleRemoveMember(
                                      member.id,
                                      member.member_type,
                                    )
                                  }
                                  isLoading={removingMemberId === key}
                                  disabled={
                                    isAddingMember ||
                                    (removingMemberId !== null &&
                                      removingMemberId !== key)
                                  }
                                  icon={UserMinus}
                                  className="w-full sm:w-auto shrink-0 justify-center !px-3 !py-1.5 text-xs whitespace-nowrap"
                                >
                                  Quitar
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreate}
              className="w-full md:w-auto px-6"
            >
              Nuevo Grupo
            </Button>
          </div>

          <ErrorMessage message={error} />

          {/* Search Filter */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar grupo por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={fetchGroups}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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

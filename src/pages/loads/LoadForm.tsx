import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loadSchema, type LoadFormValues } from "../../schemas/load.schema";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { MapPin, Calendar, DollarSign, Save, Truck } from "lucide-react";
import { groupService } from "../../api/services";
import { type CarrierGroup } from "../../types";

interface LoadFormProps {
  onSubmit: (data: LoadFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const LoadForm: React.FC<LoadFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [groups, setGroups] = React.useState<CarrierGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = React.useState<
    Record<number, { checked: boolean; rate: string }>
  >({});
  const [groupErrors, setGroupErrors] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let active = true;
    groupService
      .getGroups()
      .then((res) => {
        if (active && res.data.success && res.data.data) {
          const fetchedGroups = res.data.data;
          fetchedGroups.sort((a: CarrierGroup, b: CarrierGroup) => {
            if (a.isGeneral) return -1;
            if (b.isGeneral) return 1;
            return a.name.localeCompare(b.name);
          });
          setGroups(fetchedGroups);
          
          // Pre-select general group
          const initialSelections: Record<number, { checked: boolean; rate: string }> = {};
          fetchedGroups.forEach((g: CarrierGroup) => {
            if (g.isGeneral) {
              initialSelections[g.id] = { checked: true, rate: "" };
            }
          });
          setSelectedGroups(initialSelections);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
    mode: "onChange",
    defaultValues: {
      maxTrucks: "1",
    },
  });

  const handleFormSubmit = (data: LoadFormValues) => {
    const errors: Record<number, string> = {};
    let hasError = false;

    const targetGroupsPayload = Object.entries(selectedGroups)
      .filter(([, val]) => val.checked)
      .map(([groupId, val]) => {
        const rate = Number(val.rate);
        if (!val.rate || isNaN(rate) || rate <= 0) {
          errors[Number(groupId)] = "La tarifa es inválida o requerida";
          hasError = true;
        }
        return {
          groupId: Number(groupId),
          rate,
        };
      });

    setGroupErrors(errors);

    if (hasError) return;
    if (targetGroupsPayload.length === 0) return; // Should not happen if general is required

    onSubmit({
      ...data,
      targetGroups: targetGroupsPayload,
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Origen"
            placeholder="Ej: Buenos Aires"
            icon={MapPin}
            {...register("origin")}
            error={errors.origin?.message}
          />
          <Input
            label="Destino"
            placeholder="Ej: Rosario"
            icon={MapPin}
            {...register("destination")}
            error={errors.destination?.message}
          />
          <Input
            label="Fecha de Carga"
            type="date"
            icon={Calendar}
            {...register("loadingDate")}
            error={errors.loadingDate?.message}
          />
          <Input
            label="Fecha de Cupo"
            type="date"
            icon={Calendar}
            {...register("quotaDate")}
            error={errors.quotaDate?.message}
          />
          <Input
            label="Horario Inicio Carga"
            type="time"
            {...register("loadingTimeStart")}
            error={errors.loadingTimeStart?.message}
          />
          <Input
            label="Horario Límite Carga"
            type="time"
            {...register("loadingTimeEnd")}
            error={errors.loadingTimeEnd?.message}
          />
          <Input
            label="Cereal / Producto"
            placeholder="Ej: Soja, Maíz"
            {...register("cereal")}
            error={errors.cereal?.message}
          />
          <Input
            label="Cantidad de camiones necesarios"
            type="number"
            min="1"
            placeholder="Ej: 1"
            icon={Truck}
            {...register("maxTrucks")}
            error={errors.maxTrucks?.message}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
              Observaciones
            </label>
            <textarea
              className="w-full bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white border-slate-100 dark:border-zinc-800 focus:border-emerald-500 focus:outline-none transition-all resize-none h-24"
              placeholder="Ej: Carga frágil, requiere lona..."
              {...register("notes")}
            />
          </div>
        </div>

        {/* Groups Selection */}
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-6 space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                Tarifas por Grupo
              </h4>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Asigne la tarifa correspondiente para cada grupo de transportistas.
              </p>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-150/50">
              Cargando grupos...
            </p>
          ) : (
            <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 sm:p-5 border border-slate-100 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col gap-3">
                {groups.map((group) => {
                  const checkedGroupsCount = Object.values(selectedGroups).filter(s => s.checked).length;
                  const isGeneral = group.isGeneral;
                  const groupState = selectedGroups[group.id] || {
                    checked: isGeneral,
                    rate: "",
                  };
                  const isCheckboxDisabled = groupState.checked && checkedGroupsCount <= 1;
                  const errorMsg = groupErrors[group.id];

                  return (
                    <div
                      key={group.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                        groupState.checked
                          ? "bg-white dark:bg-zinc-900 border-emerald-500/30 shadow-sm"
                          : "border-slate-200/60 dark:border-zinc-850 hover:bg-slate-100/40 dark:hover:bg-zinc-800/30"
                      }`}
                    >
                      <label className={`flex items-center gap-3 select-none flex-1 ${isCheckboxDisabled ? "cursor-default" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={groupState.checked}
                          disabled={isCheckboxDisabled}
                          onChange={(e) => {
                            setSelectedGroups((prev) => ({
                              ...prev,
                              [group.id]: {
                                ...groupState,
                                checked: e.target.checked,
                              },
                            }));
                          }}
                          className={`rounded h-4 w-4 shrink-0 ${
                            isCheckboxDisabled
                              ? "text-slate-400 border-slate-300 bg-slate-100 cursor-not-allowed"
                              : "text-emerald-600 border-slate-300 focus:ring-emerald-500"
                          }`}
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {group.name} {isGeneral && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-2 uppercase">General</span>}
                          </span>
                          {group.description && (
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </label>

                      {groupState.checked && (
                        <div className="mt-4 sm:mt-0 sm:ml-4 sm:w-1/3 shrink-0">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={"Ej: 500000"}
                              value={groupState.rate}
                              onChange={(e) => {
                                setSelectedGroups((prev) => ({
                                  ...prev,
                                  [group.id]: {
                                    ...groupState,
                                    rate: e.target.value,
                                  },
                                }));
                                if (groupErrors[group.id]) {
                                  setGroupErrors(prev => {
                                    const next = { ...prev };
                                    delete next[group.id];
                                    return next;
                                  });
                                }
                              }}
                              className={`w-full bg-slate-50 dark:bg-zinc-800/60 border rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-800 dark:text-white font-medium focus:ring-2 focus:outline-none transition-all ${
                                errorMsg
                                  ? "border-red-300 focus:ring-red-500"
                                  : "border-slate-200 dark:border-zinc-700 focus:ring-emerald-500"
                              }`}
                            />
                          </div>
                          {errorMsg && (
                            <p className="text-red-500 text-[11px] mt-1 font-medium">{errorMsg}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!isValid}
            icon={Save}
            className="w-full sm:w-auto"
          >
            Publicar
          </Button>
        </div>
      </form>
    </div>
  );
};

import { z } from 'zod';

export const loadSchema = z.object({
  origin: z.string().min(2, 'El origen debe tener al menos 2 caracteres'),
  destination: z.string().min(2, 'El destino debe tener al menos 2 caracteres'),
  loadingDate: z.string().min(1, 'La fecha de carga es obligatoria'),
  loadingTimeStart: z.string().min(1, 'El horario de inicio es obligatorio'),
  loadingTimeEnd: z.string().min(1, 'El horario límite es obligatorio'),
  quotaDate: z.string().min(1, 'La fecha de asignación del cupo es obligatoria'),
  cereal: z.string().min(2, 'El cereal debe tener al menos 2 caracteres'),
  maxTrucks: z.string().min(1, 'La cantidad de camiones es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) % 1 === 0, 'Debe ser un número entero mayor o igual a 1'),
  notes: z.string().optional(),
  // Combo ida y vuelta: el tramo 2 (vuelta) es obligatorio solo si isCombo.
  isCombo: z.boolean().optional(),
  leg2Origin: z.string().optional(),
  leg2Destination: z.string().optional(),
  leg2Cargo: z.string().optional(),
  leg2LoadingDate: z.string().optional(),
  leg2Notes: z.string().optional(),
  targetGroups: z.array(z.object({
    groupId: z.number(),
    rate: z.number()
  })).optional(),
  excludedCarriers: z.array(z.number()).optional()
}).superRefine((data, ctx) => {
  if (!data.isCombo) return;
  const required: [keyof typeof data, string][] = [
    ['leg2Origin', 'El origen de la vuelta es obligatorio'],
    ['leg2Destination', 'El destino de la vuelta es obligatorio'],
    ['leg2Cargo', 'La carga de la vuelta es obligatoria'],
  ];
  required.forEach(([key, message]) => {
    const value = data[key];
    if (typeof value !== 'string' || value.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: [key], message });
    }
  });
});

export type LoadFormValues = z.infer<typeof loadSchema>;

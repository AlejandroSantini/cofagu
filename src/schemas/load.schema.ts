import { z } from 'zod';

export const loadSchema = z.object({
  origin: z.string().min(2, 'El origen debe tener al menos 2 caracteres'),
  destination: z.string().min(2, 'El destino debe tener al menos 2 caracteres'),
  loadingDate: z.string().min(1, 'La fecha de carga es obligatoria'),
  loadingTimeStart: z.string().min(1, 'El horario de inicio es obligatorio'),
  loadingTimeEnd: z.string().min(1, 'El horario límite es obligatorio'),
  quotaDate: z.string().min(1, 'La fecha de asignación del cupo es obligatoria'),
  cereal: z.string().min(2, 'El cereal debe tener al menos 2 caracteres'),
  rate: z.string().min(1, 'La tarifa es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La tarifa debe ser un número positivo'),
  maxTrucks: z.string().min(1, 'La cantidad de camiones es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) % 1 === 0, 'Debe ser un número entero mayor o igual a 1'),
  notes: z.string().optional(),
  targetGroups: z.array(z.object({
    groupId: z.number(),
    rate: z.number()
  })).optional()
});

export type LoadFormValues = z.infer<typeof loadSchema>;

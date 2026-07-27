import { z } from 'zod';

export const loadSchema = z.object({
  origin: z.string().min(2, 'El origen debe tener al menos 2 caracteres'),
  destination: z.string().min(2, 'El destino debe tener al menos 2 caracteres'),
  date: z.string().min(1, 'La fecha de carga es obligatoria'),
  rate: z.string().min(1, 'La tarifa es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La tarifa debe ser un número positivo'),
  maxTrucks: z.string().min(1, 'La cantidad de camiones es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) % 1 === 0, 'Debe ser un número entero mayor o igual a 1'),
  notes: z.string().optional(),
  ctg: z.string().optional(),
});

export type LoadFormValues = z.infer<typeof loadSchema>;

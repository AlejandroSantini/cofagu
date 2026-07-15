import { z } from 'zod';

export const loadSchema = z.object({
  origin: z.string().min(2, 'El origen debe tener al menos 2 caracteres'),
  destination: z.string().min(2, 'El destino debe tener al menos 2 caracteres'),
  date: z.string().min(1, 'La fecha de carga es obligatoria'),
  rate: z.string().min(1, 'La tarifa es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La tarifa debe ser un número positivo'),
  notes: z.string().optional(),
});

export type LoadFormValues = z.infer<typeof loadSchema>;

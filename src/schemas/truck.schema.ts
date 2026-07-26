import { z } from 'zod';

export const truckSchema = z.object({
  plate: z.string().min(6, 'La patente debe tener al menos 6 caracteres').max(10, 'Patente demasiado larga'),
  type: z.string().min(2, 'El tipo de camión debe tener al menos 2 caracteres'),
  capacity: z.string().min(1, 'La capacidad es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La capacidad debe ser un número positivo'),
  carrierId: z.string().optional(),
  insurancePolicy: z.string().optional(),
  insuranceCompany: z.string().optional(),
  insuranceExpiration: z.string().optional(),
});

export type TruckFormValues = z.infer<typeof truckSchema>;

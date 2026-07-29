import { z } from 'zod';

export const truckSchema = z.object({
  chassisPlate: z.string().min(6, 'La patente del chasis debe tener al menos 6 caracteres').max(10, 'Patente del chasis demasiado larga'),
  trailerPlate: z.string().min(6, 'La patente del acoplado debe tener al menos 6 caracteres').max(10, 'Patente del acoplado demasiado larga'),
  type: z.string().min(1, 'Seleccione un tipo de camión válido'),
  capacity: z.string().min(1, 'La capacidad es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La capacidad debe ser un número positivo'),
  carrierId: z.string().optional(),
  insurancePolicy: z.string().min(1, 'El número de póliza es obligatorio'),
  insuranceCompany: z.string().optional(),
  insuranceExpiration: z.string().min(1, 'La fecha de vencimiento del seguro es obligatoria'),
  insurancePolicyPhotoUrl: z.string().min(1, 'La foto de la póliza de seguro es obligatoria'),
});

export type TruckFormValues = z.infer<typeof truckSchema>;

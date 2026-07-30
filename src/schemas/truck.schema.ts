import { z } from 'zod';

export const truckSchema = z.object({
  chassisPlate: z.string().min(6, 'La patente del chasis debe tener al menos 6 caracteres').max(10, 'Patente del chasis demasiado larga'),
  trailerPlate: z.string().min(6, 'La patente del acoplado debe tener al menos 6 caracteres').max(10, 'Patente del acoplado demasiado larga'),
  type: z.string().min(1, 'Seleccione un tipo de camión válido'),
  capacity: z.string().min(1, 'La capacidad es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La capacidad debe ser un número positivo'),
  carrierId: z.string().optional(),
  // Cargo insurance - now required
  cargoInsurancePolicy: z.string().min(1, 'El número de póliza del seguro de carga es obligatorio'),
  cargoInsuranceCompany: z.string().optional(),
  cargoInsuranceExpiration: z.string().min(1, 'La fecha de vencimiento del seguro de carga es obligatoria'),
  cargoInsurancePhotoUrl: z.string().min(1, 'La foto de la póliza del seguro de carga es obligatoria'),
});

export type TruckFormValues = z.infer<typeof truckSchema>;

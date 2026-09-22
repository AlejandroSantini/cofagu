import { z } from 'zod';

/**
 * `requireInsurance: false` para LOGISTICS: el seguro de carga es
 * responsabilidad del transportista, no de la logística que carga el
 * camión en el sistema en su nombre (pedido explícito).
 */
export const makeTruckSchema = (requireInsurance: boolean) =>
  z.object({
    chassisPlate: z.string().min(6, 'La patente del chasis debe tener al menos 6 caracteres').max(10, 'Patente del chasis demasiado larga'),
    trailerPlate: z.string().min(6, 'La patente del acoplado debe tener al menos 6 caracteres').max(10, 'Patente del acoplado demasiado larga'),
    type: z.string().min(1, 'Seleccione un tipo de camión válido'),
    capacity: z.string().min(1, 'La capacidad es obligatoria').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'La capacidad debe ser un número positivo'),
    carrierId: z.string().optional(),
    cargoInsurancePolicy: requireInsurance
      ? z.string().min(1, 'El número de póliza del seguro de carga es obligatorio')
      : z.string().optional(),
    cargoInsuranceCompany: z.string().optional(),
    cargoInsuranceExpiration: requireInsurance
      ? z.string().min(1, 'La fecha de vencimiento del seguro de carga es obligatoria')
      : z.string().optional(),
    cargoInsurancePhotoUrl: requireInsurance
      ? z.string().min(1, 'La foto de la póliza del seguro de carga es obligatoria')
      : z.string().optional(),
  });

export const truckSchema = makeTruckSchema(true);
export type TruckFormValues = z.infer<typeof truckSchema>;

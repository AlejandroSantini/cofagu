import { z } from 'zod';

export const driverSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{7,10}$/, 'DNI inválido (debe tener entre 7 y 10 dígitos sin puntos)'),
  phone: z.string().min(6, 'El teléfono debe tener al menos 6 caracteres'),
  carrierId: z.string().min(1, 'Seleccione una empresa transportista'),
});

export type DriverFormValues = z.infer<typeof driverSchema>;

import { z } from 'zod';

export const carrierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'CUIT inválido (formato: XX-XXXXXXXX-X)'),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPhone: z.string().min(6, 'El teléfono debe tener al menos 6 caracteres'),
  password: z.string().optional(),
});


export type CarrierFormValues = z.infer<typeof carrierSchema>;

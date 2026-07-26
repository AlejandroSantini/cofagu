import { z } from 'zod';

export const carrierDocumentSchema = z.object({
  expirationDate: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
  fileUrl: z.string().min(1, 'El comprobante/archivo es obligatorio'),
});

export type CarrierDocumentFormValues = z.infer<typeof carrierDocumentSchema>;

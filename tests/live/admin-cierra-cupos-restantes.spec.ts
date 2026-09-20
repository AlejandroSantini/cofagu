import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { ApiClient } from './api';

/**
 * Prueba a mano contra el backend real: "Cancelar Viaje Completo" queda
 * bloqueado cuando ya hay camiones comprometidos (pedido: "¿y si esa
 * publicación no completa se cancela y ya salieron algunos trips?"). Este
 * test cubre la salida que se agregó: "Cerrar Cupos Restantes" reduce
 * maxTrucks al número ya asignado (PUT /trips/:id, confirmado que el
 * backend soporta actualización parcial) sin tocar el camión IN_PROGRESS.
 */
const skip = missingConfig(['ADMIN']);
test.describe('ADMIN · cierra los cupos restantes sin afectar el camión en curso', () => {
  test.skip(!!skip, skip || '');

  test('reduce maxTrucks al asignado y el camión IN_PROGRESS sigue intacto', async ({
    seed,
    pageAs,
  }) => {
    // maxTrucks:2 por defecto en seedTrip; llega a 'in_progress' con 1
    // camión real circulando, dejando 1 cupo libre sin nadie.
    const trip = await seed('in_progress');

    const page = await pageAs('ADMIN');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await page.getByRole('button', { name: 'Cerrar Cupos Restantes' }).click();
    await page.getByRole('button', { name: 'Cerrar Cupos', exact: true }).click();
    await expect(page.getByText('Se cerraron los cupos restantes.')).toBeVisible();

    const admin = await ApiClient.as('ADMIN');
    try {
      const updated = await admin.getTrip(trip.tripId);
      expect(updated.maxTrucks).toBe(1);

      // El camión que ya estaba en curso no se tocó.
      const stillThere = await admin.getLoad(trip.loadId!);
      expect(stillThere.status).toBe('IN_PROGRESS');
      expect(stillThere.deletedAt).toBeFalsy();
    } finally {
      await admin.dispose();
    }
  });
});

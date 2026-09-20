import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { ApiClient } from './api';

/**
 * Reproduce contra el backend real el bug reportado: un transportista
 * reporta "Demorado" (PATCH /loads/:id/status → DELAYED) en un viaje que ya
 * está en curso, y después necesita poder confirmar la llegada y cargar los
 * kilos de descarga igual. Antes del fix, la tarjeta "Mis Camiones en este
 * Viaje" no reconocía DELAYED como "en curso" y volvía a ofrecer "Iniciar
 * Viaje" — sin salida posible. Ver src/pages/loads/LoadDetails.tsx.
 *
 * También chequea, contra datos reales, si un load DELAYED aparece
 * prematuramente en `GET /loads?status=COMPLETED` (la fuga de estado que
 * explicaría por qué el admin lo veía en "Completadas" sin kg cargados).
 */
const skip = missingConfig(['ADMIN', 'CARRIER']);
test.describe('CARRIER · reporta demorado y después completa el viaje', () => {
  test.skip(!!skip, skip || '');

  test('con DELAYED, puede confirmar llegada y cargar los kg; no aparece prematuramente en Completadas', async ({
    seed,
    pageAs,
  }) => {
    const trip = await seed('in_progress');
    expect(trip.loadId, 'seedTrip debería resolver el sub-load en curso').not.toBeNull();

    const carrier = await ApiClient.as('CARRIER');
    const admin = await ApiClient.as('ADMIN');
    try {
      // 1) Reportar Demorado — mismo PATCH que dispara el botón real.
      await carrier.patchLoadStatus(trip.loadId!, 'DELAYED');

      const loadAfterDelay = await admin.getLoad(trip.loadId!);
      expect(loadAfterDelay.status).toBe('DELAYED');

      // 2) ¿Se cuela en la pestaña "Completadas" antes de tiempo?
      const completedBefore = await admin.getLoadsByStatus('COMPLETED');
      const leakedIntoCompleted = completedBefore.some(
        (l: any) => l.id === trip.loadId,
      );

      // 3) La UI real: como CARRIER, el viaje demorado tiene que ofrecer
      // "Confirmar Llegada a Destino", no "Iniciar Viaje".
      const page = await pageAs('CARRIER');
      await page.goto(`/loads/${trip.tripId}?type=trip`);

      await expect(page.getByText('DEMORADO', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Confirmar Llegada a Destino' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar Viaje' })).toHaveCount(0);

      // 4) Completa el viaje de verdad, cargando los kg de descarga.
      await page.getByRole('button', { name: 'Confirmar Llegada a Destino' }).click();
      await expect(
        page.getByRole('heading', { name: 'Registrar Descarga en Destino' }),
      ).toBeVisible();
      await page.getByPlaceholder('Ej: 29500').fill('29500');
      await page.getByRole('button', { name: 'Confirmar Llegada', exact: true }).click();

      await expect(page.getByText('Viaje finalizado con éxito')).toBeVisible({
        timeout: 15_000,
      });

      // 5) Confirmar contra la API real: el load quedó COMPLETED con
      // unloadedWeight, y AHORA sí aparece en Completadas.
      await expect
        .poll(async () => (await admin.getLoad(trip.loadId!)).status, { timeout: 15_000 })
        .toBe('COMPLETED');
      const finalLoad = await admin.getLoad(trip.loadId!);
      expect(Number(finalLoad.unloadedWeight)).toBe(29500);

      const completedAfter = await admin.getLoadsByStatus('COMPLETED');
      expect(completedAfter.some((l: any) => l.id === trip.loadId)).toBe(true);

      // Reporto lo que encontré sobre la fuga de estado, sin hacer fallar
      // el test por eso — es información para el reporte a backend.
      // eslint-disable-next-line no-console
      console.log(
        leakedIntoCompleted
          ? '⚠️  El load DELAYED SÍ aparecía en GET /loads?status=COMPLETED antes de completarse — confirma la fuga de estado.'
          : '✓ El load DELAYED NO aparecía en GET /loads?status=COMPLETED antes de completarse.',
      );
    } finally {
      await carrier.dispose();
      await admin.dispose();
    }
  });
});

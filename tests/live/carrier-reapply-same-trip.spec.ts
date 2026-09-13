import { test, expect, selectField } from './fixtures';
import { login } from './api';
import { API_URL, PREFIX, missingConfig } from './env';

/**
 * Bug reportado por el usuario: "publiqué una carga, me postulé con un
 * transportista que tiene 3 camiones, una vez terminado el viaje con los
 * camiones no pude postularme en la misma publicación de viajes".
 *
 * Confirmado: la API permite volver a postularse (con el mismo camión u
 * otro) una vez que la postulación anterior quedó COMPLETED — el bug
 * estaba en `appliedTruckIds` de LoadDetails.tsx, que trataba cualquier
 * postulación no-CANCELLED como "camión ocupado" para siempre, sin mirar
 * `tripStatus`. Este test arma el escenario real por API (viaje + camión
 * completado) y verifica desde la UI que el botón "Postularse a este
 * viaje" sigue disponible y deja elegir el camión ya usado.
 */
const skip = missingConfig(['CARRIER', 'ADMIN']);

test.describe('Volver a postularse tras completar un viaje (mismo camión)', () => {
  test.skip(!!skip, skip || '');

  test('el camión que ya completó su viaje puede volver a postularse en la misma publicación', async ({
    pageAs,
  }) => {
    const url = (p: string) => `${API_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
    const authed = (token: string) => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unwrap = async (res: Response): Promise<any> => {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      return body && typeof body === 'object' && 'data' in body ? body.data : body;
    };

    const carrier = await login('CARRIER');
    const admin = await login('ADMIN');
    const carrierId = carrier.user.carrierId!;

    const drivers = await unwrap(
      await fetch(url(`/drivers?carrierId=${carrierId}`), { headers: authed(carrier.token) }),
    );
    test.skip(drivers.length === 0, 'El carrier de QA no tiene choferes cargados');
    const driver1 = drivers[0];

    const trucks = await unwrap(
      await fetch(url(`/trucks?carrierId=${carrierId}`), { headers: authed(carrier.token) }),
    );
    test.skip(trucks.length === 0, 'El carrier de QA no tiene camiones cargados');
    const truck1 = trucks[0];

    const general = (await unwrap(await fetch(url('/groups'), { headers: authed(admin.token) }))).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (g: any) => g.isGeneral,
    );

    let tripId: number | null = null;
    try {
      const iso = new Date().toISOString();
      const trip = await unwrap(
        await fetch(url('/trips'), {
          method: 'POST',
          headers: authed(admin.token),
          body: JSON.stringify({
            origin: `${PREFIX}Origen-Reapply`,
            destination: `${PREFIX}Destino-Reapply`,
            date: iso,
            loadingDate: iso,
            quotaDate: iso,
            loadingTimeStart: '08:00',
            loadingTimeEnd: '12:00',
            cereal: 'Soja',
            maxTrucks: 2,
            notes: `${PREFIX}reaplicar tras completar (borrar con npm run test:e2e:cleanup)`,
            targetGroups: general ? [{ groupId: general.id, rate: 1000 }] : undefined,
          }),
        }),
      );
      tripId = Number(trip.id);

      await fetch(url(`/trips/${tripId}/apply`), {
        method: 'POST',
        headers: authed(carrier.token),
        body: JSON.stringify({ carrierId, driverId: driver1.id, truckId: truck1.id, notes: 'setup' }),
      });
      const tripAfterApply = await unwrap(
        await fetch(url(`/trips/${tripId}`), { headers: authed(admin.token) }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const app1 = tripAfterApply.applications.find((a: any) => a.truckId === truck1.id);
      expect(app1, 'No se encontró la postulación de setup').toBeTruthy();

      await fetch(url(`/trips/applications/${app1.id}/accept`), {
        method: 'POST',
        headers: authed(admin.token),
        body: JSON.stringify({ driverId: driver1.id, truckId: truck1.id }),
      });
      const tripAfterAccept = await unwrap(
        await fetch(url(`/trips/${tripId}`), { headers: authed(admin.token) }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subLoad1 = tripAfterAccept.loads.find((l: any) => l.truckId === truck1.id);
      expect(subLoad1, 'No se encontró el sub-load de setup').toBeTruthy();

      const ctg = ('1' + String(Date.now())).slice(-11);
      await fetch(url(`/loads/${subLoad1.id}/confirm-departure`), {
        method: 'POST',
        headers: authed(admin.token),
        body: JSON.stringify({ ctg, loadedWeight: 30000 }),
      });
      const completeRes = await fetch(url(`/loads/${subLoad1.id}/completion-data`), {
        method: 'POST',
        headers: authed(admin.token),
        body: JSON.stringify({ unloadedWeight: 30000, kg_discharge: 30000 }),
      });
      expect(completeRes.ok, `Completar el viaje de setup falló: ${await completeRes.clone().text()}`).toBe(
        true,
      );

      // Acá está el escenario real del bug: el carrier vuelve a la
      // publicación con su camión ya completado y trata de postularse de nuevo.
      const page = await pageAs('CARRIER');
      await page.goto(`/loads/${tripId}?type=trip`);

      const applyButton = page.getByRole('button', { name: 'Postularse a este viaje' });
      await expect(applyButton).toBeVisible({ timeout: 15_000 });
      await applyButton.click();

      await expect(page.getByText(/Todos los camiones de tu flota ya están postulados/)).toHaveCount(0);

      const plate = truck1.chassisPlate || truck1.plate;
      const selectByPartialLabel = async (labelText: string, optionText: string) => {
        const select = selectField(page, labelText);
        const value = await select
          .locator('option', { hasText: optionText })
          .first()
          .getAttribute('value');
        expect(value, `No se encontró la opción "${optionText}" en "${labelText}"`).toBeTruthy();
        await select.selectOption(value!);
      };
      await selectByPartialLabel('Chofer Habilitado', driver1.name);
      await selectByPartialLabel('Camión Flota', plate);

      await page.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.getByText('Postulación enviada correctamente')).toBeVisible({ timeout: 15_000 });
    } finally {
      if (tripId) await fetch(url(`/trips/${tripId}`), { method: 'DELETE', headers: authed(admin.token) });
    }
  });
});

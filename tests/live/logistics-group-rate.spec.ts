import { test, expect } from '@playwright/test';
import { login } from './api';
import { API_URL, PREFIX, missingConfig } from './env';

/**
 * Reproduce el bug reportado: "un viaje publicado con tarifas diferenciadas
 * por grupo (ej. 'solo a logística' $10 y 'General' $20) le muestra a los
 * usuarios de logística la tarifa General en vez de la específica de su
 * grupo".
 *
 * Crea un grupo y un viaje de prueba por API (prefijo E2E-), verifica qué
 * tarifa ve la cuenta LOGISTICS de QA, y limpia todo al final (grupo,
 * membresía y viaje) pase o falle el test.
 */
const skip = missingConfig(['ADMIN', 'LOGISTICS']);

test.describe('Bug de tarifa por grupo (LOGISTICS)', () => {
  test.skip(!!skip, skip || '');

  test('LOGISTICS debe ver la tarifa de SU grupo, no la General', async () => {
    const url = (p: string) => `${API_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
    const authed = (token: string) => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- diagnóstico puntual, respuestas no tipadas
    const unwrap = async (res: Response): Promise<any> => {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      return body && typeof body === 'object' && 'data' in body ? body.data : body;
    };

    const admin = await login('ADMIN');
    const logistics = await login('LOGISTICS');

    const groupsRes = await fetch(url('/groups'), { headers: authed(admin.token) });
    const groups = await unwrap(groupsRes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const general = groups.find((g: any) => g.isGeneral);
    expect(general, 'No se encontró el grupo General en /groups').toBeTruthy();

    const groupName = `${PREFIX}GrupoLogisticaTest-${Date.now()}`;
    const createGroupRes = await fetch(url('/groups'), {
      method: 'POST',
      headers: authed(admin.token),
      body: JSON.stringify({ name: groupName, description: 'Temporal — test de tarifa por grupo' }),
    });
    expect(createGroupRes.ok, `Crear grupo falló: ${await createGroupRes.clone().text()}`).toBe(true);
    const newGroup = await unwrap(createGroupRes);

    let tripId: number | null = null;
    try {
      const addMemberRes = await fetch(url(`/groups/${newGroup.id}/members`), {
        method: 'POST',
        headers: authed(admin.token),
        body: JSON.stringify({ memberId: logistics.user.id, memberType: 'logistics' }),
      });
      expect(addMemberRes.ok, `Agregar miembro logistics falló: ${await addMemberRes.clone().text()}`).toBe(
        true,
      );

      const iso = new Date().toISOString();
      const createTripRes = await fetch(url('/trips'), {
        method: 'POST',
        headers: authed(admin.token),
        body: JSON.stringify({
          origin: `${PREFIX}Origen-Rate`,
          destination: `${PREFIX}Destino-Rate`,
          date: iso,
          loadingDate: iso,
          quotaDate: iso,
          loadingTimeStart: '08:00',
          loadingTimeEnd: '12:00',
          cereal: 'Soja',
          maxTrucks: 1,
          notes: `${PREFIX}viaje de prueba de tarifa por grupo (borrar con npm run test:e2e:cleanup)`,
          targetGroups: [
            { groupId: general.id, rate: 20000 },
            { groupId: newGroup.id, rate: 10000 },
          ],
        }),
      });
      expect(createTripRes.ok, `Crear viaje falló: ${await createTripRes.clone().text()}`).toBe(true);
      const trip = await unwrap(createTripRes);
      tripId = Number(trip.id);

      const [listRes, detailRes] = await Promise.all([
        fetch(url('/trips?status=ACTIVE'), { headers: authed(logistics.token) }),
        fetch(url(`/trips/${tripId}`), { headers: authed(logistics.token) }),
      ]);
      const list = await unwrap(listRes);
      const detail = await unwrap(detailRes);
      const listArr = Array.isArray(list) ? list : list?.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inList = listArr?.find((t: any) => Number(t.id) === tripId);

      console.log(
        'LOGISTICS en el LISTADO (/trips?status=ACTIVE):',
        inList ? { rate: inList.rate, resolvedRate: inList.resolvedRate } : 'el viaje no aparece en el listado',
      );
      console.log('LOGISTICS en el DETALLE (/trips/:id):', {
        rate: detail.rate,
        resolvedRate: detail.resolvedRate,
      });

      const effectiveRate = detail.resolvedRate ?? detail.rate;
      expect(
        effectiveRate,
        `LOGISTICS debería ver $10000 (tarifa de su grupo), pero vio $${effectiveRate} (¿tarifa General filtrándose?)`,
      ).toBe(10000);
    } finally {
      if (tripId) {
        await fetch(url(`/trips/${tripId}`), { method: 'DELETE', headers: authed(admin.token) });
      }
      await fetch(url(`/groups/${newGroup.id}/members/${logistics.user.id}?memberType=logistics`), {
        method: 'DELETE',
        headers: authed(admin.token),
      });
      await fetch(url(`/groups/${newGroup.id}`), { method: 'DELETE', headers: authed(admin.token) });
    }
  });
});

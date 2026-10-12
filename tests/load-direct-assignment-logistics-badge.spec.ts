import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug real (WhatsApp, 2026-10-13): cuando balanza busca un transporte en
 * el buscador y entra a la carga (navega a `?type=load`, un sub-load
 * individual de GET /loads/:id), no aparece la insignia "Postulado por
 * Logística" aunque el viaje SÍ lo fue — entrando por el viaje completo
 * (`?type=trip`, con `applications[]`) sí aparecía.
 *
 * Causa: la insignia solo se calculaba dentro del loop de
 * `applications[]`. La tarjeta de "asignación directa" (que es la que se
 * usa cuando `load` es un sub-load individual, sin `applications`) nunca
 * la calculaba — aunque `load.logisticsId`/`load.logistics` sí vienen en
 * esa respuesta.
 */
const LOAD_ASSIGNED_BY_LOGISTICS = {
  id: 400,
  tripId: 246,
  status: "IN_PROGRESS",
  origin: "Coop Urdinarrain",
  destination: "Crushing",
  cereal: "Trigo",
  ctg: "10235518581",
  loadedWeight: 35300,
  carrierId: 66,
  carrier: { id: 66, name: "MECANICA SACK SRL" },
  driver: { name: "VILLA JAVIER" },
  truck: { chassisPlate: "AG7153Y" },
  logisticsId: 38,
  logistics: { id: 38, name: "Cañada Alsina SRL" },
  rate: 27000,
};

test.describe("Insignia 'Postulado por Logística' — también al entrar por el buscador (type=load)", () => {
  test("EMPLOYEE ve la insignia aunque entre directo a la carga, no al viaje completo", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads/400", (r) => fulfill(r, apiOk(LOAD_ASSIGNED_BY_LOGISTICS)));

    await page.goto("/loads/400?type=load");

    await expect(page.getByText("MECANICA SACK SRL")).toBeVisible();
    await expect(page.getByText(/Postulado por Logística: Cañada Alsina SRL/)).toBeVisible();
  });

  test("sin logisticsId, no muestra la insignia (postulación directa del transportista)", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads/400", (r) =>
      fulfill(r, apiOk({ ...LOAD_ASSIGNED_BY_LOGISTICS, logisticsId: null, logistics: null })),
    );

    await page.goto("/loads/400?type=load");

    await expect(page.getByText("MECANICA SACK SRL")).toBeVisible();
    await expect(page.getByText(/Postulado por Logística/)).toHaveCount(0);
  });
});

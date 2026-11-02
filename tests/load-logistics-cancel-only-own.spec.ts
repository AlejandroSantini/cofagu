import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reclamo real (WhatsApp, 2026-10-20): un viaje aceptado, con el camión ya
 * cargado y viajando, apareció "rechazado" y el cupo volvió a quedar libre.
 * Un transportista puede estar vinculado a varias logísticas, y "Mis Camiones
 * en este Viaje" de cada una mostraba —con el botón de cancelar— también las
 * postulaciones que había hecho OTRA logística con ese transportista.
 * Verlas está bien; cancelarlas solo puede la logística que postuló.
 */
const LOGISTICS_USER_ID = 7; // el id del usuario LOGISTICS mockeado
const OTHER_LOGISTICS_ID = 99;
const SHARED_CARRIER = { id: 20, name: "Mecánica Sat" };

const TRIP = {
  id: 1,
  status: "ACTIVE",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  maxTrucks: 4,
  applications: [
    {
      id: 500,
      status: "ACCEPTED",
      logisticsId: OTHER_LOGISTICS_ID,
      carrierId: SHARED_CARRIER.id,
      driverId: 1,
      truckId: 5,
      carrier: SHARED_CARRIER,
      driver: { id: 1, name: "Chofer Ajeno" },
      truck: { id: 5, chassisPlate: "AJ111AJ" },
    },
    {
      id: 501,
      status: "ACCEPTED",
      logisticsId: LOGISTICS_USER_ID,
      carrierId: SHARED_CARRIER.id,
      driverId: 2,
      truckId: 6,
      carrier: SHARED_CARRIER,
      driver: { id: 2, name: "Chofer Propio" },
      truck: { id: 6, chassisPlate: "PR222PR" },
    },
    {
      id: 502,
      status: "PENDING",
      logisticsId: OTHER_LOGISTICS_ID,
      carrierId: SHARED_CARRIER.id,
      driverId: 3,
      truckId: 7,
      carrier: SHARED_CARRIER,
      driver: { id: 3, name: "Chofer Pendiente Ajeno" },
      truck: { id: 7, chassisPlate: "PE333PE" },
    },
  ],
  loads: [
    // Ya cargó en planta (tiene CTG) pero nadie tocó "Iniciar Viaje":
    // en el sistema sigue ASSIGNED aunque el camión esté en la ruta.
    { id: 300, status: "ASSIGNED", carrierId: SHARED_CARRIER.id, truckId: 5, ctg: "10000000001", loadedWeight: 30000 },
    { id: 301, status: "ASSIGNED", carrierId: SHARED_CARRIER.id, truckId: 6, ctg: "10000000002", loadedWeight: 30000 },
  ],
};

test("una logística no puede cancelar postulaciones que hizo otra logística con un transportista compartido", async ({ page }) => {
  await loginAs(page, "LOGISTICS");
  await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([SHARED_CARRIER])));
  await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP)));
  let cancelCalls = 0;
  await page.route("**/api/loads/applications/*/cancel", (r) => {
    cancelCalls++;
    return fulfill(r, apiOk(null));
  });

  await page.goto("/loads/1?type=trip");

  // Las dos aceptadas se siguen viendo (el transportista es de las dos logísticas)...
  await expect(page.getByText("AJ111AJ")).toBeVisible();
  await expect(page.getByText("PR222PR")).toBeVisible();

  // ...pero solo la propia se puede cancelar.
  const cancelAccepted = page.getByRole("button", { name: "Cancelar Postulación / Viaje" });
  await expect(cancelAccepted).toHaveCount(1);
  const ownCard = page.locator("div").filter({ hasText: "PR222PR" }).filter({ has: cancelAccepted }).last();
  await expect(ownCard).toBeVisible();
  await expect(page.locator("div").filter({ hasText: "AJ111AJ" }).filter({ has: cancelAccepted }).filter({ hasNotText: "PR222PR" })).toHaveCount(0);

  // La pendiente de la otra logística tampoco tiene "Cancelar".
  await expect(page.getByText("Chofer Pendiente Ajeno")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toHaveCount(0);

  expect(cancelCalls).toBe(0);
});

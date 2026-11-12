import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Caso real (viaje 520, camión DIM945, 2026-11-11): el transportista se
 * postuló, canceló por rotura y se volvió a postular al mismo viaje con el
 * mismo camión. El viaje queda con dos sub-loads del mismo camión: el 1096
 * CANCELLED y el 1118 IN_PROGRESS con CTG. Las postulaciones no traen
 * `loadId`, y el front se quedaba con la primera coincidencia (la cancelada):
 * balanza veía "En viaje" y el transportista "Asignado — esperando CTG", sin
 * poder cargar los kilos de descarga.
 */
const base = { carrierId: 23, truckId: 43, driverId: 43, truck: { id: 43, chassisPlate: "DIM945" }, driver: { id: 43, name: "Esteban Fernandez" } };

const TRIP = {
  id: 520,
  status: "ACTIVE",
  origin: "Coop urdinarrain FE",
  destination: "Crushing",
  cereal: "Maíz",
  maxTrucks: 1,
  cuposPendientes: 0,
  rate: 10500,
  applications: [
    { ...base, id: 2201, status: "CANCELLED", tripStatus: "ASSIGNED", cancellationReason: "Rotura" },
    { ...base, id: 2231, status: "ACCEPTED", tripStatus: "ASSIGNED", ctg: null, loadId: null },
  ],
  loads: [
    { ...base, id: 1096, tripId: 520, status: "CANCELLED", ctg: null, loadedWeight: null },
    { ...base, id: 1118, tripId: 520, status: "IN_PROGRESS", ctg: "10236048231", loadedWeight: "30840" },
  ],
};

test("mismo camión con una carga cancelada y otra en viaje: el transportista ve la vigente y descarga sobre ella", async ({ page }) => {
  await loginAs(page, "CARRIER", { carrierId: 23 });
  await page.route("**/api/drivers*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trips/520", (r) => fulfill(r, apiOk(TRIP)));
  const completions: string[] = [];
  await page.route("**/api/loads/*/completion-data", (r) => {
    completions.push(new URL(r.request().url()).pathname);
    return fulfill(r, apiOk({}));
  });

  await page.goto("/loads/520?type=trip");

  await expect(page.getByText("EN VIAJE", { exact: true })).toBeVisible();
  await expect(page.getByText("10236048231")).toBeVisible();
  await expect(page.getByText(/Esperando que el balancero/)).toHaveCount(0);

  await page.getByRole("button", { name: "Confirmar Llegada a Destino" }).click();
  await page.getByPlaceholder("Ej: 29500").fill("30700");
  await page.getByRole("button", { name: "Confirmar Llegada", exact: true }).click();

  await expect.poll(() => completions).toEqual(["/api/loads/1118/completion-data"]);
});

/**
 * Caso real (viaje 526, VGR816, 2026-11-11): el mismo camión hizo dos vueltas
 * del viaje — sub-load 1115 COMPLETED y 1138 IN_PROGRESS, con dos
 * postulaciones ACCEPTED que ya traen `loadId`. El transportista veía dos
 * tarjetas "COMPLETADO" con la misma CTG.
 */
const base2 = { carrierId: 62, truckId: 68, driverId: 64, truck: { id: 68, chassisPlate: "VGR816" }, driver: { id: 64, name: "ANTONIO ALEZ" } };
const TRIP_526 = {
  id: 526,
  status: "ACTIVE",
  origin: "Coop",
  destination: "Puerto",
  cereal: "Pellet",
  maxTrucks: 3,
  cuposPendientes: 1,
  rate: 10000,
  applications: [
    { ...base2, id: 2267, status: "ACCEPTED", tripStatus: "IN_PROGRESS", ctg: "30036072879", loadedWeight: "29520", unloadedWeight: null, loadId: 1138 },
    { ...base2, id: 2228, status: "ACCEPTED", tripStatus: "COMPLETED", ctg: "30036048955", loadedWeight: "27960", unloadedWeight: "28180", loadId: 1115 },
  ],
  loads: [
    { ...base2, id: 1115, tripId: 526, status: "COMPLETED", ctg: "30036048955", loadedWeight: "27960", unloadedWeight: "28180" },
    { ...base2, id: 1138, tripId: 526, status: "IN_PROGRESS", ctg: "30036072879", loadedWeight: "29520", unloadedWeight: null },
  ],
};

test("mismo camión con dos vueltas en el viaje: una tarjeta completada y otra en viaje, cada una con su CTG", async ({ page }) => {
  await loginAs(page, "CARRIER", { carrierId: 62 });
  await page.route("**/api/drivers*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trips/526", (r) => fulfill(r, apiOk(TRIP_526)));
  const completions: string[] = [];
  await page.route("**/api/loads/*/completion-data", (r) => {
    completions.push(new URL(r.request().url()).pathname);
    return fulfill(r, apiOk({}));
  });

  await page.goto("/loads/526?type=trip");

  await expect(page.getByText("30036048955")).toHaveCount(1);
  await expect(page.getByText("30036072879")).toHaveCount(1);
  // Uno en el encabezado del viaje y otro en la tarjeta de la vuelta en curso.
  await expect(page.getByText("EN VIAJE", { exact: true })).toHaveCount(2);
  await expect(page.getByText("COMPLETADO", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Confirmar Llegada a Destino" }).click();
  await page.getByPlaceholder("Ej: 29500").fill("29400");
  await page.getByRole("button", { name: "Confirmar Llegada", exact: true }).click();
  await expect.poll(() => completions).toEqual(["/api/loads/1138/completion-data"]);
});


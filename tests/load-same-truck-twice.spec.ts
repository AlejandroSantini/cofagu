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

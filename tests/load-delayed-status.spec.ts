import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug reportado por un transportista: después de tocar "Reportar Demorado"
 * (que pasa el sub-load a status DELAYED, `patchLoadStatus`), la tarjeta
 * "Mis Camiones en este Viaje" dejaba de reconocer el viaje como en curso —
 * `isTripInProgress` solo miraba `IN_PROGRESS`. Volvía a ofrecer "Iniciar
 * Viaje" en vez de "Confirmar Llegada a Destino", así que el transportista
 * ya no podía cargar los kilos de descarga nunca más (quedaba en un
 * callejón sin salida). El viaje terminaba "flotando" — el admin lo veía
 * fuera de "En Curso" sin que nadie hubiera podido completarlo.
 */
const TRIP_DELAYED = {
  id: 1,
  // A propósito, no "IN_PROGRESS": si el status del viaje padre fuera ese,
  // enmascararía el bug (isTripInProgress tiene un fallback a
  // `load.status === "IN_PROGRESS"`). Lo que hay que probar es que el
  // status DEL SUB-LOAD (DELAYED, en `loads[0].status`) alcance por sí solo.
  status: "ASSIGNED",
  origin: "Campo A",
  destination: "Planta",
  maxTrucks: 1,
  applications: [
    {
      id: 200,
      status: "ACCEPTED",
      carrierId: 10,
      driverId: 1,
      truckId: 5,
      carrier: { id: 10, name: "Transporte Juan" },
      driver: { id: 1, name: "Juan Perez" },
      truck: { id: 5, chassisPlate: "AB123CD" },
    },
  ],
  loads: [
    {
      id: 300,
      status: "DELAYED",
      carrierId: 10,
      truckId: 5,
      ctg: "12345678901",
      loadedWeight: 30000,
      unloadedWeight: null,
    },
  ],
};

test.describe("Viaje DELAYED (Reportar Demorado) — el transportista no queda trabado", () => {
  test("muestra 'Confirmar Llegada a Destino', no vuelve a ofrecer 'Iniciar Viaje'", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP_DELAYED)));

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText("DEMORADO", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar Llegada a Destino" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar Viaje" })).toHaveCount(0);
  });

  test("al confirmar la llegada, abre el modal para cargar los kg de descarga", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP_DELAYED)));

    await page.goto("/loads/1?type=trip");
    await page.getByRole("button", { name: "Confirmar Llegada a Destino" }).click();

    await expect(
      page.getByRole("heading", { name: "Registrar Descarga en Destino" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Ej: 29500")).toBeVisible();
  });
});

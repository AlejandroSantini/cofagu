import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Detalle de viaje (LoadDetails) — tarjeta de cada camión asignado.
 *
 * Item 5: mostrar franja horaria de carga por transporte, en el detalle de
 * camión y combustible (antes sólo se veía la franja agregada del viaje,
 * no por cada camión/postulación).
 */
const TRIP_DETAIL = {
  id: 1,
  status: "ASSIGNED",
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 1,
  loadingTimeStart: "09:00",
  loadingTimeEnd: "11:00",
  applications: [
    {
      id: 200,
      status: "ACCEPTED",
      carrierId: 10,
      truckId: 5,
      carrier: { id: 10, name: "Transporte Juan" },
      driver: { id: 1, name: "Juan Perez" },
      truck: { id: 5, chassisPlate: "AB123CD" },
    },
  ],
  loads: [
    {
      id: 300,
      status: "ASSIGNED",
      carrierId: 10,
      truckId: 5,
      fuelConsumption: 80,
    },
  ],
};

test.describe("Detalle de viaje — franja horaria y combustible por camión", () => {
  test("la tarjeta del camión muestra Franja Horaria y Combustible", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP_DETAIL)));

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText("Franja Horaria")).toBeVisible();
    // Aparece dos veces: el resumen general del viaje y la tarjeta del camión.
    await expect(page.getByText("09:00 - 11:00 hs")).toHaveCount(2);
    await expect(page.getByText("80 Lts")).toBeVisible();
  });
});

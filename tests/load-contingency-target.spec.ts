import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Reportar Contingencia" en el detalle de un viaje (LoadDetails).
 *
 * Bug confirmado contra el backend real: LoadsPage y Dashboard SIEMPRE
 * navegan al detalle con `?type=trip` (GET /trips/:id), donde `load.id` es
 * el ID DEL VIAJE — no el del sub-load/cupo. El código reportaba la
 * contingencia con `selectedLoad.id` a ciegas, así que terminaba pegada a
 * un sub-load completamente ajeno (tripId y loadId son espacios de
 * numeración distintos). Ahora se resuelve el sub-load correcto desde
 * `load.loads[]` antes de reportar, y si no se puede resolver, el botón ni
 * se muestra (mejor ocultarlo que mandar el id equivocado).
 *
 * También: el historial ("Historial de Contingencias y Novedades") leía
 * `load.contingencies`, que en la forma "viaje" siempre viene vacío — ahora
 * se arma agregando `load.loads[].contingencies`.
 */
const TRIP_ONE_TRUCK_IN_PROGRESS = {
  id: 900, // ID DEL VIAJE — a propósito muy distinto del sub-load (300)
  status: "IN_PROGRESS",
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 1,
  cereal: "Soja",
  applications: [
    {
      id: 700,
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
      id: 300, // ID DEL SUB-LOAD/CUPO — es el que debe usarse
      status: "IN_PROGRESS",
      carrierId: 10,
      truckId: 5,
      truck: { chassisPlate: "AB123CD" },
      contingencies: [
        {
          id: 55,
          description: "Pinchazo en ruta",
          reportedBy: "Juan Perez",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ],
};

test.describe("Reportar Contingencia — usa el id del sub-load, no el del viaje", () => {
  test("el POST se manda a /loads/{idDelSubLoad}/contingencies, no al del viaje", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips/900", (r) => fulfill(r, apiOk(TRIP_ONE_TRUCK_IN_PROGRESS)));

    let postedPath: string | null = null;
    await page.route("**/api/loads/*/contingencies", (route) => {
      postedPath = new URL(route.request().url()).pathname;
      return fulfill(route, apiOk({ id: 999 }));
    });

    await page.goto("/loads/900?type=trip");

    await page.getByRole("button", { name: "Reportar Contingencia" }).click();
    await page.getByPlaceholder("Ej: Retraso por control policial en ruta 14.").fill("Pinchazo en ruta");
    await page.getByRole("button", { name: "Enviar Novedad" }).click();

    await expect.poll(() => postedPath).toBe("/api/loads/300/contingencies");
  });

  test("el historial agrega las contingencias de load.loads[] y muestra la patente", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips/900", (r) => fulfill(r, apiOk(TRIP_ONE_TRUCK_IN_PROGRESS)));

    await page.goto("/loads/900?type=trip");

    await expect(page.getByText("Historial de Contingencias y Novedades")).toBeVisible();
    await expect(page.getByText("Pinchazo en ruta")).toBeVisible();
    await expect(page.getByText(/Camión AB123CD/)).toBeVisible();
    await expect(page.getByText("No se registraron incidentes durante este traslado.")).toHaveCount(0);
  });

  test("sin ningún sub-load ASSIGNED/IN_PROGRESS que resolver, el botón no se muestra", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips/900", (r) =>
      fulfill(
        r,
        apiOk({
          ...TRIP_ONE_TRUCK_IN_PROGRESS,
          loads: [{ ...TRIP_ONE_TRUCK_IN_PROGRESS.loads[0], status: "COMPLETED" }],
        }),
      ),
    );

    await page.goto("/loads/900?type=trip");

    await expect(page.getByText("AB123CD").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reportar Contingencia" })).toHaveCount(0);
  });
});

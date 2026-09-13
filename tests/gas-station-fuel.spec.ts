import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * GAS_STATION — "Control Combustible" (LoadsPage en modo isPlayero).
 *
 * Cubre 2 fixes reportados por backend:
 * 6) La tabla ahora muestra Ruta (origin → destination) y Tarifa, además de
 *    Franja Horaria y Cereal (ya existentes).
 * 7) Un registro deja de listarse en cuanto: el viaje se cancela o se
 *    completa, o el playero toca "Cargó" / "No cargó" (fuelConsumption
 *    pasa a tener un valor != null).
 */
const TRIP = {
  id: 50,
  status: "ACTIVE",
  origin: "Córdoba",
  destination: "Rosario",
  rate: 15000,
  maxTrucks: 2,
  cereal: "Soja",
  loadingTimeStart: "08:00",
  loadingTimeEnd: "12:00",
  loads: [
    {
      id: 105,
      status: "ASSIGNED",
      fuelConsumption: null,
      carrier: { name: "Transporte Juan" },
      driver: { name: "Juan Perez", dni: "30111222" },
      truck: { chassisPlate: "AB123CD" },
    },
  ],
  applications: [],
};

test.describe("GAS_STATION · control de combustible", () => {
  test("muestra Ruta, Tarifa, Franja Horaria y Cereal", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([TRIP])));

    await page.goto("/loads");

    await expect(page.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText("Córdoba")).toBeVisible();
    await expect(page.getByText("Rosario")).toBeVisible();
    await expect(page.getByText("08:00 - 12:00 hs")).toBeVisible();
    await expect(page.getByText("Soja")).toBeVisible();
    await expect(page.getByText("$15.000")).toBeVisible();
  });

  test("al tocar 'No cargó' se envía fuelConsumption: 0 y el registro desaparece", async ({ page }) => {
    await loginAs(page, "GAS_STATION");

    // El backend real filtra por fuelConsumption != null en el refetch;
    // lo simulamos devolviendo el camión ya marcado después del PUT.
    let fuelLoaded = false;
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            ...TRIP,
            loads: [{ ...TRIP.loads[0], fuelConsumption: fuelLoaded ? 0 : null }],
          },
        ]),
      ),
    );

    let putBody: unknown = null;
    await page.route("**/api/loads/105", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      fuelLoaded = true;
      return fulfill(route, apiOk({ ...TRIP.loads[0], fuelConsumption: 0 }));
    });

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toBeVisible();

    await page.getByRole("button", { name: "No cargó" }).click();

    await expect.poll(() => putBody).toEqual({ fuelConsumption: 0 });
    await expect(page.getByText("Se registró que el camión no cargó combustible")).toBeVisible();
    await expect(page.getByText("AB123CD")).toHaveCount(0);
  });

  test("al tocar 'Cargó' pide los litros y los envía en el PUT", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([TRIP])));

    let putBody: unknown = null;
    await page.route("**/api/loads/105", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ ...TRIP.loads[0], fuelConsumption: 150 }));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Cargó", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Registrar Carga de Combustible" })).toBeVisible();
    await page.getByPlaceholder("Ej: 150").fill("150");
    await page.getByRole("button", { name: "Confirmar Carga" }).click();

    await expect.poll(() => putBody).toEqual({ fuelConsumption: 150 });
    await expect(page.getByText("Carga de combustible registrada")).toBeVisible();
  });

  test("un viaje CANCELLED no aparece en la lista de combustible", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    await page.route("**/api/trips*", (r) =>
      fulfill(r, apiOk([{ ...TRIP, loads: [{ ...TRIP.loads[0], status: "CANCELLED" }] }])),
    );

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toHaveCount(0);
    await expect(page.getByText("No se encontraron camiones autorizados para combustible.")).toBeVisible();
  });
});

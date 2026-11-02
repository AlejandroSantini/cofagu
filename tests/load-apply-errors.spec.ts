import { test, expect, type Page } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Al postularse (POST /trips/:id/apply) la app mostraba siempre el genérico
 * "Error al enviar postulación": leía `data.message`, pero el backend manda
 * el motivo en `data.error` (400/403). Además, sin cupos libres el botón
 * "Postularse" tiene que quedar deshabilitado con "Sin cupos disponibles",
 * con el mismo cálculo que el backend: maxTrucks - loads no CANCELLED/REJECTED.
 */
const TRIP = {
  id: 1,
  status: "ACTIVE",
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 2,
  applications: [],
  loads: [],
};

const FAR_FUTURE = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

async function mockCarrierResources(page: Page) {
  await page.route("**/api/drivers*", (r) =>
    fulfill(r, apiOk([{ id: 3, name: "Juan Perez", dni: "30111222", carrierId: 10 }])),
  );
  await page.route("**/api/trucks*", (r) =>
    fulfill(
      r,
      apiOk([
        {
          id: 5,
          chassisPlate: "AB123CD",
          type: "TOLVA",
          carrierId: 10,
          cargoInsuranceStatus: "APPROVED",
          cargoInsuranceExpiration: FAR_FUTURE,
        },
      ]),
    ),
  );
}

async function applyWithFirstDriverAndTruck(page: Page) {
  await page.getByRole("button", { name: "Postularse a este viaje" }).click();
  await expect(page.getByText("Postularse a Viaje")).toBeVisible();
  const selects = page.locator("select");
  await expect(selects.first().locator("option", { hasText: "Juan Perez" })).toHaveCount(1);
  await selects.first().selectOption("3");
  await selects.nth(1).selectOption("5");
  await page.getByRole("button", { name: "Confirmar" }).click();
}

test.describe("Postularse: mensajes del backend y cupos", () => {
  test("muestra el motivo del 400 por cupos y refresca el viaje a 'Sin cupos disponibles'", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    // Otro camión toma el último cupo mientras el usuario completa el modal:
    // a partir del 400, el viaje ya viene lleno y el refresco lo tiene que mostrar.
    let slotsTaken = false;
    await page.route("**/api/trips/1", (r) => {
      const loads = slotsTaken ? [{ id: 90, status: "ASSIGNED" }, { id: 91, status: "PENDING" }] : [];
      return fulfill(r, apiOk({ ...TRIP, loads }));
    });
    await page.route("**/api/trips/1/apply", (r) => {
      slotsTaken = true;
      return fulfill(r, { error: "No hay cupos disponibles para este viaje" }, 400);
    });
    await mockCarrierResources(page);

    await page.goto("/loads/1?type=trip");
    await applyWithFirstDriverAndTruck(page);

    await expect(page.getByText("No hay cupos disponibles para este viaje")).toBeVisible();
    await expect(page.getByText("Error al enviar postulación")).toHaveCount(0);

    const noSlots = page.getByRole("button", { name: "Sin cupos disponibles" });
    await expect(noSlots).toBeVisible();
    await expect(noSlots).toBeDisabled();
    await expect(page.getByRole("button", { name: "Postularse a este viaje" })).toHaveCount(0);
  });

  test("muestra el motivo de un 403 (transportista excluido)", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP)));
    await page.route("**/api/trips/1/apply", (r) =>
      fulfill(r, { error: "Este transportista está excluido de este viaje" }, 403),
    );
    await mockCarrierResources(page);

    await page.goto("/loads/1?type=trip");
    await applyWithFirstDriverAndTruck(page);

    await expect(page.getByText("Este transportista está excluido de este viaje")).toBeVisible();
    await expect(page.getByText("Error al enviar postulación")).toHaveCount(0);
  });

  test("sin error ni message en la respuesta usa el genérico", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP)));
    await page.route("**/api/trips/1/apply", (r) => fulfill(r, {}, 400));
    await mockCarrierResources(page);

    await page.goto("/loads/1?type=trip");
    await applyWithFirstDriverAndTruck(page);

    await expect(page.getByText("Error al enviar postulación")).toBeVisible();
  });

  test("cupos libres calculados como el backend: no cuentan los loads CANCELLED ni REJECTED", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...TRIP,
          loads: [
            { id: 90, status: "ASSIGNED" },
            { id: 91, status: "CANCELLED" },
            { id: 92, status: "REJECTED" },
          ],
        }),
      ),
    );
    await mockCarrierResources(page);

    await page.goto("/loads/1?type=trip");
    await expect(page.getByText("1 libres")).toBeVisible();
    await expect(page.getByRole("button", { name: "Postularse a este viaje" })).toBeEnabled();
  });
});

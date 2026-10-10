import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug real reportado por balanza (WhatsApp, 2026-10-10): buscaba el
 * transporte, lo encontraba, pero al abrir "Cargar CTG (Carta de Porte)"
 * se le bloqueaba la app entera (pantalla en blanco, sin reaccionar).
 *
 * Causa confirmada contra el backend real: un viaje ASIGNADO sin CTG
 * todavía manda `ctg: null` (no `undefined`). El botón hacía
 * `setPlantCtg(directAssignmentTrip.ctg)` sin fallback — `plantCtg` quedaba
 * en `null`, y la validación del modal (`!plantCtg.trim()`) tira
 * `TypeError: Cannot read properties of null (reading 'trim')`. No hay
 * Error Boundary en la app, así que cualquier excepción de render deja la
 * pantalla en blanco — por eso "se bloquea".
 */
const LOAD_ASSIGNED_NO_CTG = {
  id: 310,
  tripId: 216,
  status: "ASSIGNED",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  cereal: "Soja",
  ctg: null, // forma real del backend, no undefined
  loadedWeight: null,
  unloadedWeight: null,
  carrierId: 4,
  driverId: 6,
  truckId: 11,
  carrier: { id: 4, name: "Ledri a" },
  driver: { id: 6, name: "Juan Ledri" },
  truck: { id: 11, chassisPlate: "AAA123", type: "BATEA" },
};

test.describe("Modal de CTG — no crashea con ctg: null del backend", () => {
  test("EMPLOYEE puede abrir 'Cargar CTG' en un viaje recién asignado sin que la app se rompa", async ({
    page,
  }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads/310", (r) => fulfill(r, apiOk(LOAD_ASSIGNED_NO_CTG)));

    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/loads/310?type=load");
    await page.getByRole("button", { name: "Cargar CTG (Carta de Porte)" }).click();

    await expect(
      page.getByRole("heading", { name: "Registrar Carta de Porte (CTG) y Peso de Balanza" }),
    ).toBeVisible();
    // El campo CTG tiene que quedar vacío (editable), no roto.
    await expect(page.getByPlaceholder("Ej: 123456789")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Confirmar Salida de Balanza" })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

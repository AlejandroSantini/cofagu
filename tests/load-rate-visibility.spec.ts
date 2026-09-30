import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reporte real (WhatsApp, 2026-09-30): el usuario balanza busca el
 * transporte para cargar el CTG y los kg, pero no ve la tarifa acordada
 * en ningún lado — la necesita para saber qué se pactó con ese viaje.
 * La Tarifa estaba oculta para EMPLOYEE junto con OPERATOR/PLAYERO/
 * GAS_STATION; se habilita solo para EMPLOYEE.
 */
const LOAD = {
  id: 400,
  tripId: 60,
  status: "IN_PROGRESS",
  origin: "Coop Urdinarrain",
  destination: "Mol. Cañuelas (Pilar)",
  cereal: "Trigo",
  carrierId: 10,
  carrier: { id: 10, name: "Transporte Juan" },
  driver: { name: "Juan Perez" },
  truck: { chassisPlate: "AB123CD" },
  ctg: "10235367274",
  loadedWeight: 30700,
  resolvedRate: 27000,
  applications: [],
};

test.describe("Tarifa acordada visible para el balancero", () => {
  test("EMPLOYEE (Balanza) ve la tarifa acordada del viaje", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads/400", (r) => fulfill(r, apiOk(LOAD)));

    await page.goto("/loads/400?type=load");

    await expect(page.getByText("Tarifa", { exact: true })).toBeVisible();
    await expect(page.getByText("$27.000")).toBeVisible();
  });

  test("OPERATOR sigue sin ver la tarifa", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.route("**/api/loads/400", (r) => fulfill(r, apiOk(LOAD)));

    await page.goto("/loads/400?type=load");

    await expect(page.getByText("Tarifa", { exact: true })).toHaveCount(0);
  });
});

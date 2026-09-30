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

    await expect(page.getByText("Tarifa", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("$27.000").first()).toBeVisible();
  });

  test("OPERATOR sigue sin ver la tarifa", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.route("**/api/loads/400", (r) => fulfill(r, apiOk(LOAD)));

    await page.goto("/loads/400?type=load");

    await expect(page.getByText("Tarifa", { exact: true })).toHaveCount(0);
  });

  /**
   * Reporte real (WhatsApp, 2026-09-30, captura de pantalla): un viaje
   * recién ASIGNADO (sin CTG todavía) navegado como viaje (sin `?type=load`)
   * no trae `rate`/`resolvedRate` a nivel raíz — sólo viene en
   * `targetGroups[].rate`. Con un solo grupo destinatario no hay ambigüedad
   * posible, así que se puede resolver igual.
   */
  const TRIP_SINGLE_GROUP = {
    id: 233,
    status: "ASSIGNED",
    origin: "Coop urdinarrain",
    destination: "Mol cañuelas ( Pilar )",
    cereal: "Trigo",
    rate: null,
    resolvedRate: null,
    targetGroups: [{ groupId: 23, rate: 27000 }],
    carrier: { name: "Bel Marcos Julian" },
    truck: { chassisPlate: "NTX774" },
    driver: { name: "Lizarza Mirko" },
    applications: [],
  };

  test("EMPLOYEE ve la tarifa de un viaje recién asignado, resuelta desde el único grupo destinatario", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/trips/233", (r) => fulfill(r, apiOk(TRIP_SINGLE_GROUP)));
    await page.route("**/api/loads/233", (r) => fulfill(r, apiOk(TRIP_SINGLE_GROUP)));

    await page.goto("/loads/233");

    await expect(page.getByText("$27.000")).toHaveCount(2); // detalle de ruta + tarjeta asignada
  });
});

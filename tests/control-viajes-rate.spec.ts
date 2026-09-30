import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Backend agregó `resolvedRate` (tarifa ya resuelta por actor) a
 * GET /loads/ctg/:ctg — antes esta pantalla solo miraba `rate`, que en
 * viajes con varios grupos/tarifas no es necesariamente la que corresponde
 * al transportista de esa carga puntual.
 */
const LOAD_WITH_RESOLVED_RATE = {
  id: 500,
  status: "COMPLETED",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  ctg: "10235367274",
  carrier: { name: "Transporte Juan" },
  unloadedWeight: 30700,
  rate: 500000,
  resolvedRate: 27000,
};

test.describe("Control de Viajes — tarifa por CTG", () => {
  test("usa resolvedRate en vez de rate cuando el backend lo manda", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/10235367274", (r) => fulfill(r, apiOk(LOAD_WITH_RESOLVED_RATE)));

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Ingresá el número de CTG...").fill("10235367274");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText(/\$\s*27\.000/)).toBeVisible();
    await expect(page.getByText(/\$\s*500\.000/)).toHaveCount(0);
  });

  test("cae a rate cuando no hay resolvedRate", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/999", (r) =>
      fulfill(r, apiOk({ ...LOAD_WITH_RESOLVED_RATE, resolvedRate: undefined, rate: 500000 })),
    );

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Ingresá el número de CTG...").fill("999");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText(/\$\s*500\.000/)).toBeVisible();
  });
});

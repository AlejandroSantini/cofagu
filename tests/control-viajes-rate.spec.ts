import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reporte real (WhatsApp, 2026-09-30): el usuario de Control de Viajes
 * quería ver kg de origen, kg de descarga y la diferencia (con el mismo
 * aviso que ya existe en Cargas y Viajes), y pidió explícitamente que el
 * buscador de CTG use el mismo formato de tabla + búsqueda automática que
 * el resto de la app (sin botón "Buscar" aparte).
 *
 * También: backend agregó `resolvedRate` (tarifa ya resuelta por actor) a
 * GET /loads/ctg/:ctg — antes esta pantalla solo miraba `rate`.
 */
const LOAD_WITH_KG_DIFFERENCE = {
  id: 500,
  status: "COMPLETED",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  ctg: "10235367274",
  carrier: { name: "Transporte Juan" },
  loadedWeight: 35960,
  unloadedWeight: 35850,
  differenceAdjusted: false,
  rate: 500000,
  resolvedRate: 27000,
};

test.describe("Control de Viajes — buscador de CTG", () => {
  test("el buscador es automático (sin botón 'Buscar') y muestra el resultado en una tabla", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/10235367274", (r) => fulfill(r, apiOk(LOAD_WITH_KG_DIFFERENCE)));

    await page.goto("/control-viajes");

    await expect(page.getByRole("button", { name: "Buscar" })).toHaveCount(0);
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByPlaceholder("Buscar por CTG...").fill("10235367274");

    await expect(page.getByRole("cell", { name: "Transporte Juan" })).toBeVisible();
  });

  test("muestra kg origen, kg descarga, diferencia y tarifa (resolvedRate) en la tabla", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/10235367274", (r) => fulfill(r, apiOk(LOAD_WITH_KG_DIFFERENCE)));

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Buscar por CTG...").fill("10235367274");

    await expect(page.getByText("35.960 kg").first()).toBeVisible(); // kg origen
    await expect(page.getByText("35.850 kg").first()).toBeVisible(); // kg descarga
    await expect(page.getByText("110 kg", { exact: true })).toBeVisible(); // diferencia
    await expect(page.getByText(/\$\s*27\.000/)).toBeVisible(); // tarifa resuelta
    await expect(page.getByText(/\$\s*500\.000/)).toHaveCount(0);
  });

  test("muestra el aviso de diferencia de kilos, igual que en Cargas y Viajes", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/10235367274", (r) => fulfill(r, apiOk(LOAD_WITH_KG_DIFFERENCE)));

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Buscar por CTG...").fill("10235367274");

    await expect(page.getByText(/Diferencia de Kilos Faltantes Detectada/)).toBeVisible();
    await expect(page.getByText(/no bloquea al transportista/)).toBeVisible();
    // Control de Viajes no puede marcar el ajuste — esa acción es de ADMIN/OPERATOR/LOGISTICS.
    await expect(page.getByRole("button", { name: /Marcar como Ajustado/ })).toHaveCount(0);
  });

  test("sin diferencia de kilos, no muestra el aviso", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/10235367274", (r) =>
      fulfill(r, apiOk({ ...LOAD_WITH_KG_DIFFERENCE, unloadedWeight: 35960 })),
    );

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Buscar por CTG...").fill("10235367274");

    await expect(page.getByText(/Diferencia de Kilos Faltantes Detectada/)).toHaveCount(0);
  });

  test("cae a rate cuando no hay resolvedRate", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/999", (r) =>
      fulfill(r, apiOk({ ...LOAD_WITH_KG_DIFFERENCE, resolvedRate: undefined, rate: 500000 })),
    );

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Buscar por CTG...").fill("999");

    await expect(page.getByText(/\$\s*500\.000/)).toBeVisible();
  });

  test("CTG no encontrado muestra el estado vacío de la tabla", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");
    await page.route("**/api/loads/ctg/000", (r) => r.fulfill({ status: 404, body: JSON.stringify({ success: false }) }));

    await page.goto("/control-viajes");
    await page.getByPlaceholder("Buscar por CTG...").fill("000");

    await expect(page.getByText("No se encontró ningún viaje con ese CTG")).toBeVisible();
  });
});

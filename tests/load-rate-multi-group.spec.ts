import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reporte real (2026-11-06, captura de pantalla): un viaje "Coop Urdinarrain
 * (solo bateas) → Gilbert" dirigido a 4 grupos, todos a $8.000, mostraba la
 * Tarifa como "S/I" en el detalle. El backend no manda `rate`/`resolvedRate`
 * en publicaciones dirigidas, y el fallback sobre `targetGroups` solo
 * resolvía con un único grupo. Si todos los grupos tienen la misma tarifa no
 * hay ambigüedad, así que se muestra esa.
 */
const tripWithGroups = (rates: number[]) => ({
  id: 500,
  status: "ACTIVE",
  origin: "Coop Urdinarrain ( solo bateas )",
  destination: "Gilbert",
  cereal: "Maiz",
  rate: null,
  resolvedRate: null,
  maxTrucks: 1,
  targetGroups: rates.map((rate, i) => ({
    groupId: i + 1,
    rate,
    group: { id: i + 1, name: `Grupo ${i + 1}` },
  })),
  applications: [],
});

const tarifaValue = (page: import("@playwright/test").Page) =>
  page
    .getByText("Tarifa", { exact: true })
    .first()
    .locator("xpath=following-sibling::span[1]");

test.describe("Tarifa de un viaje dirigido a varios grupos", () => {
  test("detalle: todos los grupos con la misma tarifa → se muestra esa tarifa", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const trip = tripWithGroups([8000, 8000, 8000, 8000]);
    await page.route("**/api/trips/500", (r) => fulfill(r, apiOk(trip)));
    await page.route("**/api/loads/500", (r) => fulfill(r, apiOk(trip)));

    await page.goto("/loads/500");

    await expect(tarifaValue(page)).toHaveText("$8.000");
  });

  test("detalle: grupos con tarifas distintas → no se inventa una tarifa", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const trip = tripWithGroups([8000, 9000]);
    await page.route("**/api/trips/500", (r) => fulfill(r, apiOk(trip)));
    await page.route("**/api/loads/500", (r) => fulfill(r, apiOk(trip)));

    await page.goto("/loads/500");

    await expect(tarifaValue(page)).toHaveText("S/I");
  });

  test("listado: todos los grupos con la misma tarifa → se muestra esa tarifa", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) =>
      fulfill(r, apiOk([tripWithGroups([8000, 8000, 8000])])),
    );

    await page.goto("/loads");

    await expect(page.getByText("Gilbert").first()).toBeVisible();
    await expect(page.getByText("$8.000").first()).toBeVisible();
    await expect(page.getByText("Consultar")).toHaveCount(0);
  });
});

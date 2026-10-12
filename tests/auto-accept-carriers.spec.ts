import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Postulaciones Automáticas" (/auto-accept-carriers) — pedido de backend:
 * poder definir qué transportistas se aceptan solos al postularse, sin
 * revisión manual. Endpoints:
 *   GET /carriers?search=&page=&limit=&autoAccept=true|false
 *   PATCH /carriers/:id/auto-accept       { autoAccept }
 *   PATCH /carriers/auto-accept/batch     { carrierIds, autoAccept }
 *
 * Búsqueda/filtro/paginación 100% server-side (igual que "Empresas
 * Transportistas" — ver CLAUDE.md, "Buscadores y filtros"): se mandan los
 * params siempre, sin filtro de respaldo client-side.
 */
const CARRIERS_PAGE_1 = {
  success: true,
  data: [
    { id: 1, name: "Transporte Don Pepe SRL", cuit: "30-71234567-9", contactEmail: "contacto@donpepe.com", contactPhone: "3446123456", autoAccept: true },
    { id: 2, name: "Expreso Del Litoral", cuit: "30-79876543-1", contactEmail: "info@dellitoral.com", contactPhone: "3446987654", autoAccept: false },
  ],
  pagination: { total: 2, page: 1, limit: 20 },
};

test.describe("Postulaciones Automáticas", () => {
  test("ADMIN ve la lista con el estado de cada transportista (Automática/Manual)", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (r) => fulfill(r, CARRIERS_PAGE_1));

    await page.goto("/auto-accept-carriers");

    await expect(page.getByText("Transporte Don Pepe SRL")).toBeVisible();
    await expect(page.getByText("Expreso Del Litoral")).toBeVisible();
    await expect(page.getByText("Automática", { exact: true })).toBeVisible();
    await expect(page.getByText("Manual", { exact: true })).toBeVisible();
  });

  test("manda search/page/limit/autoAccept al backend (filtro y búsqueda)", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const requests: { search: string | null; autoAccept: string | null; page: string | null; limit: string | null }[] = [];
    await page.route("**/api/carriers*", (r) => {
      const url = new URL(r.request().url());
      requests.push({
        search: url.searchParams.get("search"),
        autoAccept: url.searchParams.get("autoAccept"),
        page: url.searchParams.get("page"),
        limit: url.searchParams.get("limit"),
      });
      return fulfill(r, CARRIERS_PAGE_1);
    });

    await page.goto("/auto-accept-carriers");
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests[0].page).toBe("1");
    expect(requests[0].limit).toBe("20");

    await page.getByPlaceholder("Buscar por nombre, CUIT, email o teléfono...").fill("Pepe");
    await expect.poll(() => requests.map((r) => r.search)).toContain("Pepe");

    await page.locator("select").first().selectOption("TRUE");
    await expect.poll(() => requests.map((r) => r.autoAccept)).toContain("true");
  });

  test("toggle individual llama a PATCH /carriers/:id/auto-accept con optimistic update", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return fulfill(route, CARRIERS_PAGE_1);
    });
    let patchBody: unknown = null;
    await page.route("**/api/carriers/2/auto-accept", (route) => {
      patchBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 2, name: "Expreso Del Litoral", cuit: "30-79876543-1", contactPhone: "3446987654", autoAccept: true }));
    });

    await page.goto("/auto-accept-carriers");
    await expect(page.getByText("Expreso Del Litoral")).toBeVisible();

    const row = page.locator("tr", { hasText: "Expreso Del Litoral" });
    await row.getByRole("switch").click();

    await expect.poll(() => patchBody).toEqual({ autoAccept: true });
    await expect(page.getByText(/activadas/)).toBeVisible();
  });

  test("selección múltiple + acción en lote llama a PATCH /carriers/auto-accept/batch", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return fulfill(route, CARRIERS_PAGE_1);
    });
    let batchBody: unknown = null;
    await page.route("**/api/carriers/auto-accept/batch", (route) => {
      batchBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ updatedCount: 2, autoAccept: true }));
    });

    await page.goto("/auto-accept-carriers");
    await expect(page.getByText("Transporte Don Pepe SRL")).toBeVisible();

    await page.locator("tr", { hasText: "Transporte Don Pepe SRL" }).locator('input[type="checkbox"]').check();
    await page.locator("tr", { hasText: "Expreso Del Litoral" }).locator('input[type="checkbox"]').check();

    await expect(page.getByText("2 seleccionados")).toBeVisible();
    await page.getByRole("button", { name: "Habilitar automática", exact: true }).click();

    await expect.poll(() => batchBody).toEqual({ carrierIds: [1, 2], autoAccept: true });
    await expect(page.getByText(/2 transportista\(s\) actualizados/)).toBeVisible();
  });

  test("seleccionar todos los visibles marca todas las filas de la página actual", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (r) => fulfill(r, CARRIERS_PAGE_1));

    await page.goto("/auto-accept-carriers");
    await expect(page.getByText("Transporte Don Pepe SRL")).toBeVisible();

    await page.getByText("Seleccionar todos los visibles (2)").click();

    await expect(page.getByText("2 seleccionados")).toBeVisible();
  });

  test("OPERATOR no puede acceder (solo ADMIN)", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.goto("/auto-accept-carriers");

    await expect(page.getByText("Postulaciones Automáticas")).toHaveCount(0);
  });
});

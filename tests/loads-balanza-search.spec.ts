import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Cargas y Viajes" — buscador por transportista/patente/chofer, pedido
 * explícito para Balanza (EMPLOYEE, para cargar CTG/kg más rápido) y
 * extendido a ADMIN/OPERATOR. Usa el mismo ?search= server-side que ya
 * soporta GET /loads (confirmado contra el backend real) — no en
 * GET /trips, por eso no aparece en la pestaña "Disponibles".
 */
const LOAD = {
  id: 300,
  tripId: 50,
  status: "ASSIGNED",
  origin: "Córdoba",
  destination: "Rosario",
  cereal: "Soja",
  carrier: { name: "Transporte Juan" },
  driver: { name: "Juan Perez" },
  truck: { chassisPlate: "AB123CD" },
};

test.describe("Cargas y Viajes — buscador de transportista (Balanza / Admin)", () => {
  test("EMPLOYEE (Balanza): el buscador aparece en 'Asignados' y manda ?search= al backend", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    const searches: (string | null)[] = [];
    await page.route("**/api/loads*", (route) => {
      const url = new URL(route.request().url());
      searches.push(url.searchParams.get("search"));
      return fulfill(route, apiOk([LOAD]));
    });

    await page.goto("/loads");
    await expect(page.getByText("Córdoba")).toBeVisible();

    await page
      .getByPlaceholder("Buscar por transportista, patente o chofer...")
      .fill("Transporte Juan");

    await expect.poll(() => searches).toContain("Transporte Juan");
  });

  test("ADMIN: el buscador aparece en 'Asignados' pero no en 'Disponibles'", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads*", (r) => fulfill(r, apiOk([LOAD])));

    await page.goto("/loads");
    // Pestaña por defecto para ADMIN es "Disponibles" (ACTIVE) — sin buscador.
    await expect(page.getByPlaceholder("Buscar por transportista, patente o chofer...")).toHaveCount(0);

    await page.getByRole("button", { name: "Asignados" }).click();
    await expect(page.getByPlaceholder("Buscar por transportista, patente o chofer...")).toBeVisible();
    await expect(page.getByText("Córdoba")).toBeVisible();
  });

  test("CARRIER no ve el buscador (es vista propia, no necesita buscar entre transportistas)", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads*", (r) => fulfill(r, apiOk([])));

    await page.goto("/loads");
    await page.getByRole("button", { name: "Asignados" }).click();
    await expect(page.getByPlaceholder("Buscar por transportista, patente o chofer...")).toHaveCount(0);
  });
});

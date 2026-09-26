import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Cargas y Viajes" — buscador de transportista.
 *
 * Para ADMIN y EMPLOYEE (Balanza) usa el endpoint dedicado
 * GET /loads/scale/loads/search, que junta ASSIGNED + IN_PROGRESS +
 * COMPLETED en un solo resultado con su estado — no hace falta cambiar de
 * pestaña para ver si un transportista está en viaje o ya descargó
 * (pedido explícito). Implementado por backend 2026-09-26.
 *
 * Para OPERATOR/LOGISTICS (no tienen permiso en ese endpoint) se sigue
 * usando el ?search= de siempre sobre GET /loads, acotado a la pestaña.
 *
 * Si el endpoint nuevo llegara a fallar, se cae de nuevo al comportamiento
 * anterior en vez de romper la pantalla.
 */
const SEARCH_RESULT = {
  id: 300,
  plate: "AE456FG",
  carrierName: "Transporte Don Pepe",
  driverName: "Juan Perez",
  cereal: "Soja",
  origin: "Rosario",
  destination: "San Lorenzo",
  status: "IN_PROGRESS",
  ctg: "123456789",
  loadedWeight: 30000,
  unloadedWeight: null,
};

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

test.describe("Cargas y Viajes — buscador de transportista (endpoint dedicado de Balanza)", () => {
  test("EMPLOYEE (Balanza): busca y muestra estado/CTG/kg sin depender de la pestaña", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    const searches: (string | null)[] = [];
    await page.route("**/api/loads/scale/loads/search*", (route) => {
      const url = new URL(route.request().url());
      searches.push(url.searchParams.get("search"));
      return fulfill(route, apiOk([SEARCH_RESULT]));
    });

    await page.goto("/loads");
    await page
      .getByPlaceholder("Buscar por transportista, patente o chofer...")
      .fill("Don Pepe");

    await expect.poll(() => searches).toContain("Don Pepe");
    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();
    await expect(page.getByText("EN VIAJE")).toBeVisible();
    await expect(page.getByText("123456789")).toBeVisible();
  });

  test("ADMIN: el buscador aparece incluso en 'Disponibles' y usa el endpoint dedicado", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([SEARCH_RESULT])));

    await page.goto("/loads");
    // A diferencia de OPERATOR, ADMIN sí lo ve desde "Disponibles".
    await page
      .getByPlaceholder("Buscar por transportista, patente o chofer...")
      .fill("Don Pepe");

    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();
    await expect(page.getByText("San Lorenzo")).toBeVisible();
  });

  test("Si el endpoint dedicado falla, se cae al buscador de siempre (acotado a la pestaña) sin romper la pantalla", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (route) =>
      route.fulfill({ status: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: "Not Found" }),
    );
    await page.route("**/api/loads*", (r) => fulfill(r, apiOk([LOAD])));

    await page.goto("/loads");
    await page.getByRole("button", { name: "Asignados" }).click();
    await page
      .getByPlaceholder("Buscar por transportista, patente o chofer...")
      .fill("Transporte Juan");

    await expect(page.getByText("Córdoba")).toBeVisible();
  });

  test("OPERATOR (sin acceso al endpoint dedicado) sigue sin buscador en 'Disponibles'", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads*", (r) => fulfill(r, apiOk([LOAD])));

    await page.goto("/loads");
    await expect(page.getByPlaceholder("Buscar por transportista, patente o chofer...")).toHaveCount(0);

    await page.getByRole("button", { name: "Asignados" }).click();
    await expect(page.getByPlaceholder("Buscar por transportista, patente o chofer...")).toBeVisible();
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

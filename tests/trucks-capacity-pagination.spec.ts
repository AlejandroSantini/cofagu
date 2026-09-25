import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Camiones" (/trucks) — filtro por capacidad (kg) y paginación server-side.
 *
 * El backend todavía no soporta `minCapacity`/`maxCapacity`/`page`/`limit`
 * en GET /trucks (confirmado en vivo: los ignora y devuelve todo). Mientras
 * tanto el filtro por kg se resuelve client-side sobre lo ya cargado (mismo
 * criterio que el filtro por tipo, que ya funcionaba así). El día que el
 * backend sume `pagination` en la respuesta, la tabla pasa sola a paginación
 * server-side — se cubre acá mockeando esa forma de respuesta.
 */
const TRUCKS = [
  { id: 1, chassisPlate: "AAA111", type: "BATEA", capacity: 20000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
  { id: 2, chassisPlate: "BBB111", type: "BATEA", capacity: 30000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
];

test.describe("Camiones — filtro por capacidad (kg)", () => {
  test("filtra client-side por Mín/Máx kg mientras el backend no lo soporte", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk(TRUCKS)));

    await page.goto("/trucks");
    await expect(page.getByText("AAA111")).toBeVisible();
    await expect(page.getByText("BBB111")).toBeVisible();

    await page.getByPlaceholder("Mín kg").fill("25000");

    await expect(page.getByText("BBB111")).toBeVisible();
    await expect(page.getByText("AAA111")).toHaveCount(0);
  });

  test("manda minCapacity/maxCapacity al backend por si ya los soporta", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));

    const queries: URLSearchParams[] = [];
    await page.route("**/api/trucks*", (route) => {
      queries.push(new URL(route.request().url()).searchParams);
      return fulfill(route, apiOk(TRUCKS));
    });

    await page.goto("/trucks");
    await page.getByPlaceholder("Mín kg").fill("25000");
    await page.getByPlaceholder("Máx kg").fill("35000");

    await expect
      .poll(() => queries.at(-1)?.get("minCapacity"))
      .toBe("25000");
    expect(queries.at(-1)?.get("maxCapacity")).toBe("35000");
  });

  test("con `pagination` en la respuesta, la tabla usa paginación server-side", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));

    await page.route("**/api/trucks*", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: TRUCKS,
          pagination: { total: 45, page: 1, limit: 20 },
        }),
      }),
    );

    await page.goto("/trucks");
    await expect(page.getByText("AAA111")).toBeVisible();
    // El total de la respuesta manda (45), no la cantidad de la página actual (2).
    await expect(page.getByText("Total: 45", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });
});

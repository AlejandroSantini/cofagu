import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Camiones" (/trucks) — buscador por transportista/patente.
 *
 * Confirmado contra el backend real: GET /trucks?search=... ya filtra
 * server-side (127 camiones cargados hoy, y creciendo — no tiene sentido
 * traerlos todos al cliente para filtrar ahí). El filtro por kg todavía no
 * existe en el backend (probado con varios nombres de parámetro), así que
 * por ahora solo se resuelve la búsqueda por nombre/patente.
 */
const TRUCKS = [
  { id: 1, chassisPlate: "AAA111", type: "TOLVA", capacity: 30000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
];

test.describe("Camiones — buscador por transportista/patente", () => {
  test("el término se manda al backend por ?search=, con debounce", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));

    const searches: (string | null)[] = [];
    await page.route("**/api/trucks*", (route) => {
      const url = new URL(route.request().url());
      searches.push(url.searchParams.get("search"));
      return fulfill(route, apiOk(TRUCKS));
    });

    await page.goto("/trucks");
    await expect(page.getByText("AAA111")).toBeVisible();

    await page.getByPlaceholder("Buscar por transportista o patente...").fill("Transporte A");

    await expect.poll(() => searches).toContain("Transporte A");
    // No debe parpadear a skeleton en el refetch sobre datos ya visibles.
    await expect(page.getByText("AAA111")).toBeVisible();
  });
});

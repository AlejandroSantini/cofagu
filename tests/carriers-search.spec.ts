import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido real (WhatsApp, 2026-10-12): "Empresas Transportistas" no tenía
 * buscador — con 284+ registros reales, scrollear para encontrar uno era
 * incómodo.
 *
 * El filtro va CLIENT-SIDE, a diferencia del resto de la app: confirmado
 * contra el backend real que `GET /carriers` siempre trae la lista
 * COMPLETA sin paginar (no hay un límite de 20 como en /trucks), y que su
 * `?search=` no filtra nada server-side (lo ignora). Como ya tenemos todo
 * en memoria, filtrar acá es correcto y no corre el riesgo de "solo
 * filtra la página actual" que señala CLAUDE.md para listas paginadas.
 */
const CARRIERS = [
  { id: 1, name: "Agrored s.r.l", cuit: "30-70830465-0", contactEmail: "agroredurdi@gmail.com", contactPhone: "3446634150" },
  { id: 2, name: "Transportes del Sur", cuit: "30-99999999-9", contactEmail: "sur@example.com", contactPhone: "3446111111" },
  { id: 3, name: "Bourlot alberto", cuit: "20-22012885-8", contactEmail: null, contactPhone: "3446222222" },
];

test.describe("Empresas Transportistas — buscador", () => {
  test("filtra por nombre, CUIT, email o teléfono sin pegarle al backend (ya tiene todo cargado)", async ({ page }) => {
    await loginAs(page, "ADMIN");
    let requestCount = 0;
    await page.route("**/api/carriers", (r) => {
      requestCount++;
      return fulfill(r, apiOk(CARRIERS));
    });

    await page.goto("/carriers");

    await expect(page.getByText("Agrored s.r.l")).toBeVisible();
    await expect(page.getByText("Transportes del Sur")).toBeVisible();
    await expect(page.getByText("Bourlot alberto")).toBeVisible();
    await expect(page.getByText("Total: 3", { exact: true })).toBeVisible();

    const search = page.getByPlaceholder("Buscar por nombre, CUIT, email o teléfono...");

    await search.fill("sur");
    await expect(page.getByText("Transportes del Sur")).toBeVisible();
    await expect(page.getByText("Agrored s.r.l")).toHaveCount(0);
    await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();

    await search.fill("3446222222");
    await expect(page.getByText("Bourlot alberto")).toBeVisible();
    await expect(page.getByText("Transportes del Sur")).toHaveCount(0);

    await search.fill("20-22012885-8");
    await expect(page.getByText("Bourlot alberto")).toBeVisible();

    // Nunca manda ?search= de más: el filtro es puramente local.
    const requestsAfterTyping = requestCount;
    await search.fill("algo que no existe");
    await expect(page.getByText("Agrored s.r.l")).toHaveCount(0);
    await expect(page.getByText("Bourlot alberto")).toHaveCount(0);
    expect(requestCount).toBe(requestsAfterTyping);
  });
});

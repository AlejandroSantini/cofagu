import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido real (WhatsApp, 2026-10-12): "Empresas Transportistas" no tenía
 * buscador — con 284+ registros reales, scrollear para encontrar uno era
 * incómodo. También se pidió explícitamente que la paginación/búsqueda sea
 * responsabilidad del backend, no del frontend.
 *
 * Se manda `search`/`page`/`limit` al backend siempre (igual que
 * TrucksPage con minCapacity/maxCapacity) — hoy el backend real los ignora
 * por completo (confirmado: page=1 y page=2 devuelven lo mismo, limit=10
 * igual trae los 284, `search` no filtra nada), así que el filtro
 * client-side de respaldo es el que realmente filtra MIENTRAS tanto. En
 * cuanto el backend empiece a mandar `pagination` en la respuesta, el
 * filtro local se apaga solo y se confía 100% en lo que ya vino filtrado
 * del servidor — filtrar de nuevo ahí rompería justo lo que CLAUDE.md
 * pide evitar (solo verías lo que matchea dentro de la página actual).
 */
const CARRIERS = [
  { id: 1, name: "Agrored s.r.l", cuit: "30-70830465-0", contactEmail: "agroredurdi@gmail.com", contactPhone: "3446634150" },
  { id: 2, name: "Transportes del Sur", cuit: "30-99999999-9", contactEmail: "sur@example.com", contactPhone: "3446111111" },
  { id: 3, name: "Bourlot alberto", cuit: "20-22012885-8", contactEmail: null, contactPhone: "3446222222" },
];

test.describe("Empresas Transportistas — buscador", () => {
  test("manda search/page/limit al backend, y mientras los ignore, filtra client-side de respaldo", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const searchesSent: (string | null)[] = [];
    await page.route("**/api/carriers*", (r) => {
      const url = new URL(r.request().url());
      searchesSent.push(url.searchParams.get("search"));
      // Simula al backend real de hoy: ignora los params, siempre devuelve todo.
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
    await expect.poll(() => searchesSent).toContain("sur");

    await search.fill("3446222222");
    await expect(page.getByText("Bourlot alberto")).toBeVisible();
    await expect(page.getByText("Transportes del Sur")).toHaveCount(0);

    await search.fill("20-22012885-8");
    await expect(page.getByText("Bourlot alberto")).toBeVisible();
  });

  test("si el backend empieza a paginar de verdad (manda `pagination`), deja de filtrar en el cliente y confía en lo que llegó", async ({ page }) => {
    await loginAs(page, "ADMIN");
    // Simula backend YA actualizado: pagina de verdad y solo devuelve lo
    // que matchea el search recibido — menos registros que el total real.
    await page.route("**/api/carriers*", (r) => {
      const url = new URL(r.request().url());
      const search = url.searchParams.get("search");
      const matched = search
        ? CARRIERS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : CARRIERS;
      return fulfill(r, {
        success: true,
        data: matched,
        pagination: { total: matched.length, page: 1, limit: 20 },
      });
    });

    await page.goto("/carriers");
    await expect(page.getByText("Agrored s.r.l")).toBeVisible();
    await expect(page.getByText("Total: 3", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Buscar por nombre, CUIT, email o teléfono...").fill("sur");

    // El backend ya devolvió solo lo que matchea — el cliente no debe
    // volver a filtrar sobre eso (si lo hiciera, el resultado sería el
    // mismo acá, pero la regresión real sería que una vez que el backend
    // pagine de verdad, un filtro local adicional ocultaría resultados
    // válidos de otras páginas). Total refleja lo que mandó el backend.
    await expect(page.getByText("Transportes del Sur")).toBeVisible();
    await expect(page.getByText("Agrored s.r.l")).toHaveCount(0);
    await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();
  });
});

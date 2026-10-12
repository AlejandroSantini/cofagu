import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido real (WhatsApp, 2026-10-12): "Empresas Transportistas" necesitaba
 * buscador. Pedido explícito de seguimiento: que la búsqueda y la
 * paginación sean 100% responsabilidad del backend — sin ningún filtro de
 * respaldo en el frontend, ni para search ni para paginar.
 *
 * Se manda `search`/`page`/`limit` a GET /carriers siempre (igual que
 * TrucksPage con minCapacity/maxCapacity, pero sin el filtro client-side
 * de respaldo que sí tiene ese caso). Lo que se muestra es EXACTAMENTE lo
 * que devuelve el backend, sin tocarlo. Hoy el backend ignora esos
 * parámetros (confirmado: page=1 y page=2 devuelven lo mismo, limit=10
 * igual trae todo, `search` no filtra nada) — así que el buscador
 * todavía no filtra nada visualmente, a propósito: el día que el backend
 * lo implemente, empieza a funcionar solo, sin ningún cambio de acá.
 */
const CARRIERS = [
  { id: 1, name: "Agrored s.r.l", cuit: "30-70830465-0", contactEmail: "agroredurdi@gmail.com", contactPhone: "3446634150" },
  { id: 2, name: "Transportes del Sur", cuit: "30-99999999-9", contactEmail: "sur@example.com", contactPhone: "3446111111" },
  { id: 3, name: "Bourlot alberto", cuit: "20-22012885-8", contactEmail: null, contactPhone: "3446222222" },
];

// Más de 10 para probar que no se arme una paginación falsa de a 10.
const MANY_CARRIERS = Array.from({ length: 15 }, (_, i) => ({
  id: 100 + i,
  name: `Transporte ${i}`,
  cuit: `30-7000000${i}-0`,
  contactEmail: `t${i}@example.com`,
  contactPhone: `34460000${i}`,
}));

test.describe("Empresas Transportistas — buscador 100% backend", () => {
  test("manda search/page/limit al backend en cada tecla, sin filtrar nada del lado del cliente", async ({ page }) => {
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
    await expect(page.getByText("Total: 3", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Buscar por nombre, CUIT, email o teléfono...").fill("sur");

    // El pedido viajó al backend con el término...
    await expect.poll(() => searchesSent).toContain("sur");
    // ...pero como el backend de hoy lo ignora y devuelve todo, la pantalla
    // sigue mostrando los 3 — el frontend NO filtra nada por su cuenta.
    await expect(page.getByText("Agrored s.r.l")).toBeVisible();
    await expect(page.getByText("Bourlot alberto")).toBeVisible();
    await expect(page.getByText("Total: 3", { exact: true })).toBeVisible();
  });

  test("en cuanto el backend devuelve `pagination`, se muestra exactamente lo que mandó (ya filtrado/paginado)", async ({ page }) => {
    await loginAs(page, "ADMIN");
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

    await expect(page.getByText("Transportes del Sur")).toBeVisible();
    await expect(page.getByText("Agrored s.r.l")).toHaveCount(0);
    await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();
  });

  test("con más de 10 registros y sin pagination del backend, muestra TODO en una sola página (sin armar '1 2 3...' de a 10)", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk(MANY_CARRIERS)));

    await page.goto("/carriers");

    // Los 15 están visibles de una, no solo los primeros 10.
    for (const c of MANY_CARRIERS) {
      await expect(page.getByText(c.name, { exact: true })).toBeVisible();
    }
    // No hay botones de página 2/3 — una sola página real.
    await expect(page.getByRole("button", { name: "2", exact: true })).toHaveCount(0);
  });
});

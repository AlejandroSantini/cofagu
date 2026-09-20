import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Grupos de Transportistas" (/groups): el buscador por nombre/descripción
 * manda `search` a `GET /groups` — no filtra en el cliente. Mismo patrón que
 * el de "Auditoría de Seguros" (ver `tests/carrier-documents-search.spec.ts`).
 */
function mockGroupsSearch(
  page: import("@playwright/test").Page,
  onRequest?: (search: string | null) => void,
) {
  const ALL = [
    { id: 1, name: "Grupo Norte", description: "Zona norte", members: [] },
    { id: 2, name: "Grupo Sur", description: "Zona sur", members: [] },
  ];
  return page.route("**/api/groups*", (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("search");
    onRequest?.(search);
    const filtered = search
      ? ALL.filter(
          (g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.description.toLowerCase().includes(search.toLowerCase()),
        )
      : ALL;
    return fulfill(route, apiOk(filtered));
  });
}

test.describe("Grupos de Transportistas — buscador (server-side)", () => {
  test("el filtro se manda al backend por query param, no se calcula en el cliente", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    const searches: (string | null)[] = [];
    await mockGroupsSearch(page, (search) => searches.push(search));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/users*", (r) => fulfill(r, apiOk([])));

    await page.goto("/groups");

    await expect(page.getByText("Grupo Norte")).toBeVisible();
    await expect(page.getByText("Grupo Sur")).toBeVisible();

    await page
      .getByPlaceholder("Buscar grupo por nombre o descripción...")
      .fill("norte");

    await expect(page.getByText("Grupo Norte")).toBeVisible();
    await expect(page.getByText("Grupo Sur")).toHaveCount(0);
    await expect.poll(() => searches).toContain("norte");
  });
});

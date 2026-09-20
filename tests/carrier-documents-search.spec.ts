import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * ADMIN — "Auditoría de Seguros" (/documents): buscador por transportista
 * sobre la tabla de "Pólizas Presentadas" (pedido explícito: con muchas
 * pólizas listadas, encontrar la de un transportista puntual a ojo era
 * incómodo).
 *
 * El filtro va al backend (`GET /trucks?search=...`), no se calcula en el
 * cliente — pedido explícito: con la flota creciendo, traer todo y filtrar
 * en el navegador no escala. Ver `truckService.getTrucks` en
 * `src/api/services.ts` y el pedido a backend en docs/api/trucks.md.
 * El mock de estos tests filtra `ALL_TRUCKS` por el query param `search`
 * tal como se espera que lo haga el backend real.
 */
const ALL_TRUCKS = [
  {
    id: 1,
    chassisPlate: "AAA123",
    type: "ACOPLADO",
    capacity: 30000,
    carrierId: 10,
    carrier: { id: 10, name: "Ledria" },
    cargoInsurancePhotoUrl: "https://example.com/poliza1.jpg",
    cargoInsuranceExpiration: "2026-12-29",
    cargoInsuranceStatus: "APPROVED",
  },
  {
    id: 2,
    chassisPlate: "AAA666",
    type: "ACOPLADO",
    capacity: 30000,
    carrierId: 11,
    carrier: { id: 11, name: "Correa" },
    cargoInsurancePhotoUrl: "https://example.com/poliza2.jpg",
    cargoInsuranceExpiration: "2026-12-31",
    cargoInsuranceStatus: "APPROVED",
  },
  {
    id: 3,
    chassisPlate: "AAD999",
    type: "CHASIS_Y_ACOPLADO",
    capacity: 30000,
    carrierId: 12,
    carrier: { id: 12, name: "Transportes Rápidos S.A." },
    cargoInsurancePhotoUrl: "https://example.com/poliza3.jpg",
    cargoInsuranceExpiration: "2027-01-01",
    cargoInsuranceStatus: "PENDING",
  },
  // La tabla pagina de a 10 (client-side, sobre lo que ya devolvió el
  // backend). Relleno para forzar una 2da página.
  ...Array.from({ length: 15 }, (_, i) => ({
    id: 100 + i,
    chassisPlate: `BBB${100 + i}`,
    type: "ACOPLADO",
    capacity: 30000,
    carrierId: 200 + i,
    carrier: { id: 200 + i, name: `Relleno ${i}` },
    cargoInsurancePhotoUrl: "https://example.com/poliza-relleno.jpg",
    cargoInsuranceExpiration: "2026-12-30",
    cargoInsuranceStatus: "APPROVED",
  })),
];

/** Simula el filtrado que debe hacer el backend real por `?search=`. */
function mockTrucksSearch(
  page: import("@playwright/test").Page,
  onRequest?: (search: string | null) => void,
) {
  return page.route("**/api/trucks*", (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("search");
    onRequest?.(search);
    const filtered = search
      ? ALL_TRUCKS.filter((t) =>
          t.carrier.name.toLowerCase().includes(search.toLowerCase()),
        )
      : ALL_TRUCKS;
    return fulfill(route, apiOk(filtered));
  });
}

test.describe("Auditoría de Seguros — buscador de transportistas (server-side)", () => {
  test("el filtro se manda al backend por query param, no se calcula en el cliente", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    const searches: (string | null)[] = [];
    await mockTrucksSearch(page, (search) => searches.push(search));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");
    await expect(page.getByText("Ledria")).toBeVisible();
    await expect(page.getByText("Total: 18", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Buscar transportista...").fill("correa");

    // El backend filtra: solo debería quedar Correa, no un filtro visual.
    await expect(page.getByText("Correa")).toBeVisible();
    await expect(page.getByText("Ledria")).toHaveCount(0);
    await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();

    // Confirma que realmente viajó como query param al endpoint.
    await expect.poll(() => searches).toContain("correa");
  });

  test("sin resultados del backend muestra el mensaje vacío, no una tabla en blanco", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    await mockTrucksSearch(page);
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");
    await page
      .getByPlaceholder("Buscar transportista...")
      .fill("no existe este transportista");

    await expect(
      page.getByText("No se encontraron pólizas para ese transportista."),
    ).toBeVisible();
    await expect(page.getByText("Total: 0", { exact: true })).toBeVisible();
  });

  test("buscar estando en la página 2 (paginado local sobre el resultado) no deja la tabla vacía por error", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    await mockTrucksSearch(page);
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");

    // 18 registros sin filtrar, 10 por página: los "Relleno" quedan en la
    // página 2, "Ledria" en la 1.
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText("Relleno 7")).toBeVisible();
    await expect(page.getByText("Ledria")).toHaveCount(0);

    // Todavía en página 2, busco algo que el backend filtrado solo devuelve
    // en la página 1 del resultado nuevo (que ahora tiene 1 sola página).
    await page.getByPlaceholder("Buscar transportista...").fill("ledria");

    await expect(page.getByText("Ledria")).toBeVisible();
    await expect(
      page.getByText("No se encontraron pólizas para ese transportista."),
    ).toHaveCount(0);
  });
});

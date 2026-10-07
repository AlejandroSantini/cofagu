import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido real (WhatsApp, 2026-10-07): a las logísticas se les juntan muchos
 * camiones en un mismo viaje y, para cargarle los kg de descarga a uno
 * puntual, tenían que scrollear toda la lista de "Mis Camiones en este
 * Viaje".
 *
 * Ojo: este buscador filtra EN MEMORIA, a diferencia del resto de la app.
 * Las postulaciones vienen embebidas y completas dentro de GET /trips/:id
 * (sin paginar — en la base real el viaje más grande tiene 15), así que no
 * hay nada que pedirle al backend. Ver CLAUDE.md, "Buscadores y filtros".
 */
const PLATES = ["AA111AA", "BB222BB", "CC333CC", "DD444DD", "EE555EE", "FF666FF", "GG777GG"];
const DRIVERS = ["Acosta", "Benitez", "Caballero", "Denardi", "Exner", "Fajardo", "Giordano"];

const tripWith = (count: number) => ({
  id: 1,
  status: "IN_PROGRESS",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  maxTrucks: count,
  applications: PLATES.slice(0, count).map((plate, i) => ({
    id: 200 + i,
    status: "ACCEPTED",
    logisticsId: 7, // el id del usuario LOGISTICS mockeado
    carrierId: 10 + i,
    driverId: 1 + i,
    truckId: 5 + i,
    carrier: { id: 10 + i, name: `Transporte ${i}` },
    driver: { id: 1 + i, name: DRIVERS[i] },
    truck: { id: 5 + i, chassisPlate: plate },
  })),
  loads: PLATES.slice(0, count).map((_, i) => ({
    id: 300 + i,
    status: "IN_PROGRESS",
    carrierId: 10 + i,
    truckId: 5 + i,
    ctg: `1000000000${i}`,
    loadedWeight: 30000,
    unloadedWeight: null,
  })),
});

async function setup(page: import("@playwright/test").Page, count: number) {
  await loginAs(page, "LOGISTICS");
  await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(tripWith(count))));
  await page.goto("/loads/1?type=trip");
}

test.describe("Mis Camiones en este Viaje — buscador para logísticas", () => {
  test("con muchos camiones aparece el buscador y filtra por patente", async ({ page }) => {
    await setup(page, 7);

    await expect(page.getByText("Mis Camiones en este Viaje (7)")).toBeVisible();
    const search = page.getByPlaceholder("Buscar por patente, chofer o CTG...");
    await expect(search).toBeVisible();
    await expect(page.getByText("CC333CC")).toBeVisible();

    await search.fill("CC333");

    await expect(page.getByText("CC333CC")).toBeVisible();
    await expect(page.getByText("AA111AA")).toHaveCount(0);
    await expect(page.getByText("GG777GG")).toHaveCount(0);
  });

  test("también encuentra por chofer y por CTG", async ({ page }) => {
    await setup(page, 7);
    const search = page.getByPlaceholder("Buscar por patente, chofer o CTG...");

    await search.fill("Exner");
    await expect(page.getByText("EE555EE")).toBeVisible();
    await expect(page.getByText("AA111AA")).toHaveCount(0);

    // El CTG del índice 1 (BB222BB) es 10000000001
    await search.fill("10000000001");
    await expect(page.getByText("BB222BB")).toBeVisible();
    await expect(page.getByText("EE555EE")).toHaveCount(0);
  });

  test("sin coincidencias avisa, sin romper la pantalla", async ({ page }) => {
    await setup(page, 7);

    await page.getByPlaceholder("Buscar por patente, chofer o CTG...").fill("ZZZ999");

    await expect(page.getByText(/Ningún camión coincide con "ZZZ999"/)).toBeVisible();
    await expect(page.getByText("AA111AA")).toHaveCount(0);
    // El contador del título sigue mostrando el total real, no el filtrado.
    await expect(page.getByText("Mis Camiones en este Viaje (7)")).toBeVisible();
  });

  test("con pocos camiones no se muestra el buscador (sería ruido)", async ({ page }) => {
    await setup(page, 3);

    await expect(page.getByText("Mis Camiones en este Viaje (3)")).toBeVisible();
    await expect(page.getByPlaceholder("Buscar por patente, chofer o CTG...")).toHaveCount(0);
  });
});

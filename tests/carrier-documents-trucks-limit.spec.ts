import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug real (WhatsApp, 2026-10-07): el admin no veía en "Auditoría de
 * Seguros" pólizas que el propio transportista sí tenía cargadas como
 * pendientes de revisión. Confirmado contra el backend real: `GET /trucks`
 * sin `limit` pagina en 20 por defecto (cambió de comportamiento — antes
 * devolvía todo). Con 280 camiones reales en la base y 19 pólizas
 * pendientes, el admin no veía NINGUNA sin buscar puntualmente por el
 * nombre de ese transportista — los 19 caían fuera de los primeros 20.
 *
 * El mock de este test imita esa paginación real: si no viaja un `limit`
 * suficientemente alto, el "backend" simulado solo devuelve los primeros 20.
 */
const PENDING_TRUCK_BEYOND_20 = {
  id: 999,
  chassisPlate: "ZZZ999",
  type: "ACOPLADO",
  capacity: 30000,
  carrierId: 500,
  carrier: { id: 500, name: "Transportista Nuevo" },
  cargoInsurancePhotoUrl: "https://example.com/poliza-pendiente.jpg",
  cargoInsuranceExpiration: "2027-01-01",
  cargoInsuranceStatus: "PENDING",
};

const FILLER_TRUCKS = Array.from({ length: 25 }, (_, i) => ({
  id: 100 + i,
  chassisPlate: `BBB${100 + i}`,
  type: "ACOPLADO",
  capacity: 30000,
  carrierId: 200 + i,
  carrier: { id: 200 + i, name: `Relleno ${i}` },
  cargoInsurancePhotoUrl: "https://example.com/poliza-relleno.jpg",
  cargoInsuranceExpiration: "2026-12-30",
  cargoInsuranceStatus: "APPROVED",
}));

// Orden real del backend: el pendiente queda al final (posición 26 de 26),
// fuera de cualquier límite de 20.
const ALL_TRUCKS = [...FILLER_TRUCKS, PENDING_TRUCK_BEYOND_20];

test.describe("Auditoría de Seguros — no perder pólizas pendientes por el límite de paginación", () => {
  test("sin buscar nada, pide un límite alto y muestra la póliza pendiente aunque esté más allá de los primeros 20", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    let requestedLimit: number | null = null;
    await page.route("**/api/trucks*", (route) => {
      const url = new URL(route.request().url());
      const limit = Number(url.searchParams.get("limit") || 0);
      requestedLimit = limit;
      // Imita al backend real: sin un limit suficientemente alto, corta en 20.
      const data = limit >= ALL_TRUCKS.length ? ALL_TRUCKS : ALL_TRUCKS.slice(0, 20);
      return fulfill(route, apiOk(data));
    });
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");

    await expect.poll(() => requestedLimit).not.toBeNull();
    expect(requestedLimit as number).toBeGreaterThanOrEqual(ALL_TRUCKS.length);

    // El total tiene que reflejar los 26 reales, no quedar cortado en 20.
    await expect(page.getByText(`Total: ${ALL_TRUCKS.length}`, { exact: true })).toBeVisible();

    // La póliza pendiente (posición 26, fuera de cualquier límite de 20)
    // tiene que llegar — la tabla pagina local de a 10, así que está en la
    // página 3.
    await page.getByRole("button", { name: "3", exact: true }).click();
    await expect(page.getByText("Transportista Nuevo")).toBeVisible();
    await expect(page.getByText("PENDIENTE", { exact: false })).toBeVisible();
  });
});

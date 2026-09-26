import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Cargas y Viajes" — pestaña "Canceladas".
 *
 * Confirmado contra el backend real: GET /loads?status=CANCELLED (lo que
 * usaba esta pestaña) siempre devuelve vacío, porque una postulación
 * cancelada ANTES de ser aceptada nunca llega a tener un registro de carga
 * (Load) — la cancelación queda solo en la Application. Ahora se resuelve
 * con getCancelledApplications() (GET /loads/applications/cancelled), que
 * hoy todavía no existe en el backend (404) — mientras tanto se muestra un
 * aviso en vez de una tabla vacía engañosa.
 */
const CANCELLED_APP = {
  id: 293,
  tripId: 181,
  status: "CANCELLED",
  cancellationReason: "Reparación",
  carrier: { id: 36, name: "Vazquez miguel" },
  driver: { name: "Chofer Vazquez" },
  truck: { chassisPlate: "AYC240" },
  trip: { origin: "Campo A", destination: "Planta", cereal: "Soja" },
  updatedAt: "2026-09-22T01:04:44.802Z",
};

test.describe("Cargas y Viajes — pestaña Canceladas", () => {
  test("mientras el backend no tenga el endpoint (404), muestra el aviso en vez de una tabla vacía", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/applications/cancelled", (route) =>
      route.fulfill({ status: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: "Not Found" }),
    );

    await page.goto("/loads");
    await page.getByRole("button", { name: "Canceladas" }).click();

    await expect(page.getByText(/todavía no está disponible/)).toBeVisible();
    await expect(page.getByText("No hay postulaciones canceladas.")).toHaveCount(0);
  });

  test("con el endpoint disponible, muestra transportista, camión, ruta y motivo", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/applications/cancelled", (r) => fulfill(r, apiOk([CANCELLED_APP])));

    await page.goto("/loads");
    await page.getByRole("button", { name: "Canceladas" }).click();

    await expect(page.getByText("Vazquez miguel")).toBeVisible();
    await expect(page.getByText("AYC240")).toBeVisible();
    await expect(page.getByText("Campo A")).toBeVisible();
    await expect(page.getByText("Reparación")).toBeVisible();
  });

  test("clickear una fila navega al viaje correspondiente", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/applications/cancelled", (r) => fulfill(r, apiOk([CANCELLED_APP])));
    await page.route("**/api/trips/181", (r) => fulfill(r, apiOk({ id: 181, status: "ACTIVE", applications: [], loads: [] })));

    await page.goto("/loads");
    await page.getByRole("button", { name: "Canceladas" }).click();
    await page.getByText("Vazquez miguel").click();

    await expect(page).toHaveURL(/\/loads\/181\?type=trip/);
  });
});

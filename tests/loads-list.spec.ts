import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Cargas y Viajes" (LoadsPage) — listado principal.
 *
 * Cubre 2 fixes reportados por backend:
 * 1) Los viajes/cargas CANCELLED o REJECTED no deben quedar "flotando" en
 *    ninguna pestaña salvo la de Cancelados (aunque el backend los incluya
 *    en la respuesta), para que no se vea el camión/chofer de otro
 *    transportista como si siguiera asignado.
 * 3) La pestaña "Disponibles" (ACTIVE) muestra Fecha de Carga y Fecha de
 *    Cupo (antes sólo mostraba una única columna "Fecha").
 * 8) La tarifa mostrada respeta `resolvedRate` (tarifa específica de grupo)
 *    por sobre `rate` (tarifa general) cuando el backend la envía.
 * 9) Columna "Cereal", visible para todos los roles.
 */
test.describe("Cargas y Viajes — listado", () => {
  test("un viaje CANCELLED no aparece en 'Disponibles' aunque el backend lo incluya", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 1,
            status: "ACTIVE",
            origin: "Campo A",
            destination: "Planta",
            rate: 5000,
            maxTrucks: 2,
            applications: [],
          },
          {
            id: 2,
            status: "CANCELLED",
            origin: "Campo B",
            destination: "Planta",
            rate: 5000,
            carrier: { name: "Transportista Ajeno" },
            driver: { name: "Chofer Ajeno" },
            truck: { chassisPlate: "ZZ999ZZ" },
            applications: [],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByText("Campo A")).toBeVisible();
    await expect(page.getByText("Campo B")).toHaveCount(0);
    await expect(page.getByText("Transportista Ajeno")).toHaveCount(0);
    await expect(page.getByText("Chofer Ajeno")).toHaveCount(0);
  });

  test("un load REJECTED no aparece en la pestaña 'Asignados'", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 10,
            status: "ASSIGNED",
            origin: "Campo Vigente",
            destination: "Planta",
            rate: 3000,
            carrier: { name: "Mi Empresa" },
          },
          {
            id: 11,
            status: "REJECTED",
            origin: "Campo Rechazado",
            destination: "Planta",
            rate: 3000,
            carrier: { name: "Otro Transportista" },
          },
        ]),
      ),
    );

    await page.goto("/loads");
    await page.getByRole("button", { name: "Asignados" }).click();

    await expect(page.getByText("Campo Vigente")).toBeVisible();
    await expect(page.getByText("Campo Rechazado")).toHaveCount(0);
    await expect(page.getByText("Otro Transportista")).toHaveCount(0);
  });

  test("'Disponibles' muestra Fecha de Carga y Fecha de Cupo", async ({ page }) => {
    const loadingDate = "2026-09-15T12:00:00.000Z";
    const quotaDate = "2026-09-16T12:00:00.000Z";
    const expectedLoadingDate = new Date(loadingDate).toLocaleDateString("es-AR");
    const expectedQuotaDate = new Date(quotaDate).toLocaleDateString("es-AR");

    await loginAs(page, "CARRIER");
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 1,
            status: "ACTIVE",
            origin: "Campo A",
            destination: "Planta",
            rate: 5000,
            maxTrucks: 1,
            loadingDate,
            quotaDate,
            applications: [],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByRole("columnheader", { name: "Fecha de Carga" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Fecha de Cupo" })).toBeVisible();
    await expect(page.getByText(expectedLoadingDate)).toBeVisible();
    await expect(page.getByText(expectedQuotaDate)).toBeVisible();
  });

  test("LOGISTICS ve la tarifa de su grupo (resolvedRate) y no la general (rate)", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 1,
            status: "ACTIVE",
            origin: "Rosario",
            destination: "Buenos Aires",
            rate: 20,
            resolvedRate: 10,
            maxTrucks: 1,
            applications: [],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByText("$10")).toBeVisible();
    await expect(page.getByText("$20")).toHaveCount(0);
  });

  test("la columna Cereal se muestra para cualquier rol (ej. EMPLOYEE)", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 65,
            status: "ASSIGNED",
            origin: "Rosario",
            destination: "Nelson Regner",
            cereal: "Trigo",
            carrier: { name: "Alejandro Santini" },
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByRole("columnheader", { name: "Cereal" })).toBeVisible();
    await expect(page.getByText("Trigo")).toBeVisible();
  });

  test("un transportista no ve la identidad de otros transportistas en 'Disponibles'", async ({ page }) => {
    // Confirmado contra el backend real: GET /trips?status=ACTIVE devuelve
    // applications[]/loads[] de TODOS los transportistas, no solo del que
    // consulta. Hasta que backend lo filtre, el frontend nunca debe mostrar
    // la identidad de un transportista ajeno en el listado de Disponibles.
    await loginAs(page, "CARRIER", { carrierId: 1 });
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 50,
            status: "ACTIVE",
            origin: "planta cofagu",
            destination: "britos",
            maxTrucks: 5,
            applications: [
              {
                id: 1,
                status: "ACCEPTED",
                carrierId: 3, // otro transportista, no el que consulta (carrierId 1)
                carrier: { name: "tommasi nicolas" },
                driver: { name: "Rios" },
                truck: { plate: "ABC 300" },
              },
            ],
            loads: [
              {
                id: 1,
                status: "COMPLETED",
                carrierId: 3,
                carrier: { name: "tommasi nicolas" },
                driver: { name: "Rios" },
                truck: { plate: "ABC 300" },
              },
            ],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByText("planta cofagu")).toBeVisible();
    await expect(page.getByText("tommasi nicolas")).toHaveCount(0);
    await expect(page.getByText("Rios")).toHaveCount(0);
    await expect(page.getByText("ABC 300")).toHaveCount(0);
    await expect(page.getByText("Sin Asignar")).toBeVisible();
  });

  test("sí ve su propia identidad cuando el camión asignado es suyo", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 1 });
    await page.route("**/api/trips*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 50,
            status: "ACTIVE",
            origin: "planta cofagu",
            destination: "britos",
            maxTrucks: 5,
            applications: [
              {
                id: 1,
                status: "ACCEPTED",
                carrierId: 1, // el mismo transportista que consulta
                carrier: { name: "Mi Empresa" },
                driver: { name: "Juan Perez" },
                truck: { plate: "AB123CD" },
              },
            ],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByText("Mi Empresa")).toBeVisible();
    await expect(page.getByText("Juan Perez")).toBeVisible();
  });
});

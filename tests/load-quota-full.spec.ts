import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Transportistas que quedaban esperando en "Postulado — en revisión" con el
 * viaje ya lleno. Backend ahora, al completar los cupos, pasa las
 * postulaciones en espera a CANCELLED con motivo "Cupos completos. Postúlate
 * a una nueva carga", manda `statusLabel`/`statusMessage`/`isQuotaFull` en
 * cada application y una notificación `TRIP_QUOTA_FILLED`. Formas de los
 * mocks tomadas de `enrichApplication` (trips.service.js) del backend.
 */
const BASE_TRIP = {
  id: 1,
  status: "ACTIVE",
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 1,
  cuposPendientes: 0,
  loads: [],
};

const myApp = {
  id: 700,
  carrierId: 10,
  driverId: 3,
  truckId: 5,
  carrier: { id: 10, name: "Transporte Juan" },
  driver: { id: 3, name: "Juan Perez", dni: "30111222" },
  truck: { id: 5, chassisPlate: "AB123CD" },
};

async function mockCarrierResources(page: import("@playwright/test").Page) {
  await page.route("**/api/drivers*", (r) => fulfill(r, apiOk([])));
  await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));
}

test.describe("Postulación que quedó afuera por cupos completos", () => {
  test("CANCELLED por cupo: muestra 'Cupos completos' + leyenda + botón, nada de 'en revisión'", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await mockCarrierResources(page);
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...BASE_TRIP,
          applications: [
            {
              ...myApp,
              status: "CANCELLED",
              cancellationReason: "Cupos completos. Postúlate a una nueva carga",
              statusLabel: "Cupos completos",
              statusMessage: "Postúlate a una nueva carga",
              isQuotaFull: true,
            },
          ],
        }),
      ),
    );
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));

    await page.goto("/loads/1?type=trip");

    const card = page.getByTestId("quota-full-apps");
    await expect(card.getByText("Cupos completos", { exact: true })).toBeVisible();
    await expect(card.getByText("Postúlate a una nueva carga")).toBeVisible();
    await expect(card.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText(/en revisión/)).toHaveCount(0);
    await expect(page.getByText("Tus Postulaciones Pendientes")).toHaveCount(0);

    await card.getByRole("button", { name: "Ver cargas disponibles" }).click();
    await expect(page).toHaveURL(/\/loads$/);
  });

  test("PENDING en un viaje con cuposPendientes 0 tampoco queda 'en revisión' ni se puede cancelar", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await mockCarrierResources(page);
    await page.route("**/api/trips/1", (r) =>
      fulfill(r, apiOk({ ...BASE_TRIP, applications: [{ ...myApp, status: "PENDING" }] })),
    );

    await page.goto("/loads/1?type=trip");

    const card = page.getByTestId("quota-full-apps");
    await expect(card.getByText("Cupos completos", { exact: true })).toBeVisible();
    await expect(card.getByText("Postúlate a una nueva carga")).toBeVisible();
    await expect(page.getByText(/en revisión/)).toHaveCount(0);
    await expect(page.getByText("PENDIENTE", { exact: true })).toHaveCount(0);
  });

  test("PENDING con cupos libres sigue mostrándose 'en revisión' (sin cambios)", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await mockCarrierResources(page);
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...BASE_TRIP,
          maxTrucks: 2,
          cuposPendientes: 1,
          applications: [
            { ...myApp, status: "PENDING", statusLabel: "Postulado en revisión", isQuotaFull: false },
          ],
        }),
      ),
    );

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("Postulado — en revisión por el operador")).toBeVisible();
    await expect(page.getByTestId("quota-full-apps")).toHaveCount(0);
  });

  test("ACCEPTED en viaje lleno (isQuotaFull del viaje = true) sigue como asignado", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await mockCarrierResources(page);
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...BASE_TRIP,
          applications: [
            { ...myApp, status: "ACCEPTED", tripStatus: "ASSIGNED", statusLabel: "Asignado", isQuotaFull: true },
          ],
        }),
      ),
    );

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText(/Mis Camiones en este Viaje/)).toBeVisible();
    await expect(page.getByTestId("quota-full-apps")).toHaveCount(0);
  });

  test("listado de activos: el viaje lleno con mi postulación muestra 'Cupos completos'", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips?*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            ...BASE_TRIP,
            applications: [
              {
                ...myApp,
                status: "CANCELLED",
                cancellationReason: "Cupos completos. Postúlate a una nueva carga",
                statusLabel: "Cupos completos",
                statusMessage: "Postúlate a una nueva carga",
                isQuotaFull: true,
              },
            ],
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByText("Cupos completos", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Postúlate a una nueva carga").first()).toBeVisible();
  });

  test("pestaña Canceladas: motivo 'Cupos completos' con subtítulo", async ({ page }) => {
    // CARRIER no tiene esta pestaña; la ven staff y logística.
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/applications/cancelled", (r) =>
      fulfill(
        r,
        apiOk([
          {
            ...myApp,
            tripId: 1,
            status: "CANCELLED",
            cancellationReason: "Cupos completos. Postúlate a una nueva carga",
            statusLabel: "Cupos completos",
            statusMessage: "Postúlate a una nueva carga",
            isQuotaFull: true,
            trip: { origin: "Campo A", destination: "Planta", cereal: "Soja" },
            updatedAt: "2026-10-26T12:00:00.000Z",
          },
        ]),
      ),
    );

    await page.goto("/loads");
    await page.getByRole("button", { name: "Canceladas" }).click();

    await expect(page.getByText("Cupos completos", { exact: true })).toBeVisible();
    await expect(page.getByText("Postúlate a una nueva carga")).toBeVisible();
    await expect(page.getByText("Cupos completos. Postúlate a una nueva carga")).toHaveCount(0);
  });

  test("pestaña Canceladas: un motivo cargado a mano que dice 'cupo' es una cancelación común", async ({ page }) => {
    // Backend (2026-10-27) ya solo marca el motivo automático; un motivo
    // escrito a mano viene con statusLabel "Cancelada". Igual, si llegara
    // marcado, el texto original no se pierde.
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/applications/cancelled", (r) =>
      fulfill(
        r,
        apiOk([
          {
            ...myApp,
            tripId: 1,
            status: "CANCELLED",
            cancellationReason: "Se cayó el cupo por problemas en destino",
            statusLabel: "Cancelada",
            statusMessage: "Se cayó el cupo por problemas en destino",
            isQuotaFull: false,
            trip: { origin: "Campo A", destination: "Planta", cereal: "Soja" },
          },
        ]),
      ),
    );

    await page.goto("/loads");
    await page.getByRole("button", { name: "Canceladas" }).click();

    await expect(page.getByText("Se cayó el cupo por problemas en destino")).toBeVisible();
    await expect(page.getByText("Cupos completos", { exact: true })).toHaveCount(0);
  });

  test("notificación TRIP_QUOTA_FILLED lleva al listado de viajes, no al viaje lleno", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/notifications/*/read", (r) => fulfill(r, apiOk({})));
    await page.route("**/api/notifications", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: "n1",
            userId: "4",
            type: "TRIP_QUOTA_FILLED",
            title: "Cupos completos",
            message: "Los cupos para el viaje a Planta se han completado. Postúlate a una nueva carga.",
            read: false,
            link: "/loads?type=trip&id=1",
            createdAt: "2026-10-26T12:00:00.000Z",
          },
        ]),
      ),
    );

    await page.goto("/notifications");
    await page.getByText(/se han completado/).click();

    await expect(page).toHaveURL(/\/loads$/);
  });

  test("vista del admin: la postulación que se cayó por cupo dice 'Cupos completos', no 'Rechazada'", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...BASE_TRIP,
          applications: [
            {
              ...myApp,
              status: "CANCELLED",
              cancellationReason: "Cupos completos. Postúlate a una nueva carga",
              statusLabel: "Cupos completos",
              isQuotaFull: true,
            },
            {
              ...myApp,
              id: 701,
              carrierId: 11,
              carrier: { id: 11, name: "Transporte Pedro" },
              status: "CANCELLED",
              cancellationReason: "Camión roto",
              statusLabel: "Cancelada",
            },
            {
              ...myApp,
              id: 702,
              carrierId: 12,
              carrier: { id: 12, name: "Transporte Ana" },
              status: "REJECTED",
            },
          ],
        }),
      ),
    );
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("Transporte Juan")).toBeVisible();
    await expect(page.getByText("Cupos completos", { exact: true })).toBeVisible();
    await expect(page.getByText("CANCELADA", { exact: true })).toBeVisible();
    // Solo la que de verdad se rechazó dice "Rechazada".
    await expect(page.getByText("RECHAZADA", { exact: true })).toHaveCount(1);
  });
});

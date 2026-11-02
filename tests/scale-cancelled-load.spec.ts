import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Balanza (EMPLOYEE) y camiones que cancelaron la carga. Backend:
 * - GET /loads/scale/loads/search SIN `search` devuelve solo ASSIGNED +
 *   IN_PROGRESS (los cancelados ya no vienen; COMPLETED tampoco, hay que
 *   pedirlo con `?status=COMPLETED`).
 * - CON `search` también devuelve CANCELLED/REJECTED con `statusLabel`,
 *   `isCancelled` y `cancellationReason`.
 * - A balanza le llega "🚨 Camión canceló carga" (TRIP_CANCELLED) con
 *   `link: '/scale'`.
 * Formas tomadas de `searchScaleLoads` (loads.service.js) del backend.
 */
const WAITING = {
  id: 300,
  plate: "AE456FG",
  carrierName: "Transporte Don Pepe",
  driverName: "Juan Perez",
  cereal: "Soja",
  origin: "Rosario",
  destination: "San Lorenzo",
  status: "ASSIGNED",
  statusLabel: "Asignado",
  isCancelled: false,
  cancellationReason: null,
  ctg: null,
  loadedWeight: null,
  unloadedWeight: null,
};

const CANCELLED = {
  ...WAITING,
  id: 301,
  plate: "XY999ZZ",
  carrierName: "Transporte Canceló",
  status: "CANCELLED",
  statusLabel: "Canceló carga",
  isCancelled: true,
  cancellationReason: "Se rompió el camión",
};

const COMPLETED = {
  ...WAITING,
  id: 302,
  plate: "CC111DD",
  carrierName: "Transporte Descargó",
  status: "COMPLETED",
  statusLabel: "Completado",
  ctg: "999",
  loadedWeight: 30000,
  unloadedWeight: 29900,
};

test.describe("Balanza — camión que canceló la carga", () => {
  test("buscando la patente: fila marcada, badge 'Canceló carga' + motivo, y no abre el detalle", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (route) => {
      const search = new URL(route.request().url()).searchParams.get("search");
      return fulfill(route, apiOk(search ? [CANCELLED] : [WAITING]));
    });

    await page.goto("/loads");
    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();

    await page.getByPlaceholder("Buscar por transportista, patente o chofer...").fill("XY999");

    const row = page.getByRole("row").filter({ hasText: "XY999ZZ" });
    await expect(row.getByText("Canceló carga")).toBeVisible();
    await expect(row.getByText("Motivo: Se rompió el camión")).toBeVisible();
    await expect(row).toHaveClass(/bg-rose-50/);

    await row.click();
    await expect(page).toHaveURL(/\/loads$/);
  });

  test("un camión que no canceló sigue abriendo el detalle", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([WAITING])));
    await page.route("**/api/loads/300", (r) =>
      fulfill(r, apiOk({ id: 300, tripId: 50, status: "ASSIGNED", origin: "Rosario", destination: "San Lorenzo" })),
    );

    await page.goto("/loads");
    await page.getByRole("row").filter({ hasText: "AE456FG" }).click();
    await expect(page).toHaveURL(/\/loads\/300\?type=load/);
  });

  test("detalle de una carga CANCELLED: sin botón de CTG / báscula", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([])));
    const base = {
      id: 301,
      tripId: 50,
      origin: "Rosario",
      destination: "San Lorenzo",
      carrier: { name: "Transporte Canceló" },
      driver: { name: "Juan Perez" },
      truck: { chassisPlate: "XY999ZZ" },
      ctg: null,
    };
    let status = "ASSIGNED";
    await page.route("**/api/loads/301", (r) => fulfill(r, apiOk({ ...base, status })));

    // Control: con la carga ASSIGNED el botón está.
    await page.goto("/loads/301?type=load");
    await expect(page.getByRole("button", { name: "Cargar CTG (Carta de Porte)" })).toBeVisible();

    status = "CANCELLED";
    await page.reload();
    await expect(page.getByText("XY999ZZ").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Cargar CTG|Editar CTG/ })).toHaveCount(0);
  });

  test("Completadas: sin búsqueda se pide ?status=COMPLETED (la vista general ya no las trae)", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (route) => {
      const status = new URL(route.request().url()).searchParams.get("status");
      return fulfill(route, apiOk(status === "COMPLETED" ? [COMPLETED] : [WAITING]));
    });

    await page.goto("/loads");
    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();

    await page.getByRole("button", { name: "Completadas" }).click();
    await expect(page.getByText("Transporte Descargó")).toBeVisible();
    await expect(page.getByText("DESCARGÓ", { exact: true })).toBeVisible();
  });

  test("push en foreground: la grilla se refresca y el camión cancelado desaparece", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    let cancelled = false;
    await page.route("**/api/loads/scale/loads/search*", (r) =>
      fulfill(r, apiOk(cancelled ? [] : [WAITING])),
    );

    await page.goto("/loads");
    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();

    // El backend lo saca de la vista general; llega la push.
    cancelled = true;
    // Simula lo que hace `onMessage` de FCM en usePushNotifications (en el
    // test no hay FCM): mismo módulo que usa la app, servido por Vite.
    await page.evaluate(async () => {
      const mod = await import("/src/store/useNotificationStore.ts");
      mod.useNotificationStore.getState().registerPush("TRIP_CANCELLED");
    });

    await expect(page.getByText("Transporte Don Pepe")).toHaveCount(0);
  });

  test("el link '/scale' de la notificación lleva a la pantalla de Balanza", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([WAITING])));

    await page.goto("/scale");
    await expect(page).toHaveURL(/\/loads$/);
    await expect(page.getByText("Transporte Don Pepe")).toBeVisible();
  });
});

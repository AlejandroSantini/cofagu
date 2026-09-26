import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Auditoría de Seguros" (/documents) — deshabilitar/rehabilitar un camión
 * ya auditado. Pedido explícito: antes, una vez APPROVED, no había forma
 * de volver atrás. Confirmado contra el backend real: PUT /trucks/:id ya
 * acepta el cambio de estado aunque el camión ya esté auditado — el
 * candado era puramente de la UI (el botón de auditoría desaparecía).
 */
const APPROVED_TRUCK = {
  id: 1,
  chassisPlate: "AAA123",
  type: "ACOPLADO",
  capacity: 30000,
  carrierId: 10,
  carrier: { id: 10, name: "Ledria" },
  cargoInsurancePhotoUrl: "x",
  cargoInsuranceExpiration: "2026-12-29",
  cargoInsuranceStatus: "APPROVED",
};

const REJECTED_TRUCK = {
  ...APPROVED_TRUCK,
  id: 2,
  cargoInsuranceStatus: "REJECTED",
};

test.describe("Auditoría de Seguros — deshabilitar/habilitar un camión ya auditado", () => {
  test("APPROVED muestra 'Deshabilitar', que pide confirmación y manda REJECTED", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));
    let putBody: unknown = null;
    await page.route("**/api/trucks*", (route) => {
      if (route.request().method() !== "PUT") return fulfill(route, apiOk([APPROVED_TRUCK]));
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ ...APPROVED_TRUCK, cargoInsuranceStatus: "REJECTED" }));
    });
    await page.route("**/api/trucks/1", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ ...APPROVED_TRUCK, cargoInsuranceStatus: "REJECTED" }));
    });

    await page.goto("/documents");
    await expect(page.getByRole("button", { name: "Deshabilitar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Deshabilitar" }).click();
    await expect(page.getByRole("heading", { name: "Deshabilitar Camión" })).toBeVisible();
    await expect(page.getByText(/no va a poder postularse/)).toBeVisible();

    await page.getByRole("button", { name: "Deshabilitar", exact: true }).first().click();

    await expect.poll(() => putBody).toEqual({ cargoInsuranceStatus: "REJECTED", insuranceStatus: "REJECTED" });
    await expect(page.getByText(/deshabilitado/)).toBeVisible();
  });

  test("REJECTED muestra 'Habilitar' en vez de 'Deshabilitar'", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([REJECTED_TRUCK])));

    await page.goto("/documents");
    await expect(page.getByRole("button", { name: "Habilitar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deshabilitar" })).toHaveCount(0);
  });
});

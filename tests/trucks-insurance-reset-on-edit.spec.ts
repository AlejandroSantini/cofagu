import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reporte real (WhatsApp, 2026-10-13): cuando se actualizaba el
 * vencimiento de la póliza de un camión (ej. al renovarla), el camión
 * quedaba "habilitado" solo, sin que un admin volviera a autorizarlo. El
 * reset a PENDING al editar solo pasaba cuando editaba el propio
 * transportista (`isCarrier`) — si ADMIN/OPERATOR editaban los mismos
 * campos, el payload no tocaba `cargoInsuranceStatus` para nada.
 *
 * Ahora se compara contra los datos de seguro que tenía el camión al
 * entrar a editar: si cambió cualquiera (póliza, aseguradora,
 * vencimiento o foto), vuelve a PENDING sin importar el rol — y si no
 * cambió nada de eso, el estado no se toca.
 */
const TRUCK = {
  id: 1,
  chassisPlate: "JHG677",
  trailerPlate: "JHG765",
  type: "TOLVA",
  capacity: 50000,
  carrierId: 9,
  carrier: { id: 9, name: "Alejandro Santini" },
  cargoInsuranceStatus: "APPROVED",
  cargoInsurancePolicy: "CAR-123456",
  cargoInsuranceCompany: "La Segunda",
  cargoInsuranceExpiration: "2026-10-01",
  cargoInsurancePhotoUrl: "https://example.com/poliza.jpg",
  habilitado: true,
};

function textField(page: import("@playwright/test").Page, label: string) {
  return page.locator("label", { hasText: label }).locator("xpath=following-sibling::div//input");
}

test.describe("Camiones — editar el vencimiento del seguro vuelve a pedir autorización", () => {
  test("ADMIN cambia la fecha de vencimiento → el camión vuelve a PENDING", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks/1", (r) => fulfill(r, apiOk(TRUCK)));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Alejandro Santini" }])));
    let putBody: any = null;
    await page.route("**/api/trucks/1", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 1 }));
    });

    await page.goto("/trucks/1");

    await textField(page, "Fecha de vencimiento").fill("2027-01-01");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect.poll(() => putBody).not.toBeNull();
    expect(putBody.cargoInsuranceStatus).toBe("PENDING");
    expect(putBody.insuranceStatus).toBe("PENDING");
    await expect(
      page.getByText(/queda pendiente de que lo autorices de nuevo/),
    ).toBeVisible();
  });

  test("ADMIN guarda SIN cambiar nada del seguro → no se toca el estado", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks/1", (r) => fulfill(r, apiOk(TRUCK)));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Alejandro Santini" }])));
    let putBody: any = null;
    await page.route("**/api/trucks/1", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 1 }));
    });

    await page.goto("/trucks/1");
    // Solo cambia la capacidad, nada del seguro.
    await textField(page, "Capacidad Útil").fill("51000");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect.poll(() => putBody).not.toBeNull();
    expect(putBody.cargoInsuranceStatus).toBeUndefined();
    expect(putBody.insuranceStatus).toBeUndefined();
    await expect(page.getByText("Camión actualizado con éxito")).toBeVisible();
  });

  test("CARRIER sigue mandando PENDING siempre al editar (sin cambios en ese comportamiento)", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 9 });
    await page.route("**/api/trucks/1", (r) => fulfill(r, apiOk(TRUCK)));
    let putBody: any = null;
    await page.route("**/api/trucks/1", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 1 }));
    });

    await page.goto("/trucks/1");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect.poll(() => putBody).not.toBeNull();
    expect(putBody.cargoInsuranceStatus).toBe("PENDING");
  });
});

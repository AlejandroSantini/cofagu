import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Camiones" (/trucks) — el seguro de carga es responsabilidad del
 * transportista, no de la logística que carga el camión en su nombre
 * (pedido explícito por WhatsApp). Para LOGISTICS:
 *   - el formulario de alta/edición no pide ni exige datos de seguro,
 *   - la lista no muestra las columnas "Seguro de Carga" ni "Estado
 *     Habilitación" (ambas derivadas del mismo estado de seguro).
 * Confirmado contra el backend real: POST /trucks ya acepta la creación
 * sin ningún campo de seguro (HTTP 201), no hizo falta pedir nada a
 * backend para esto.
 */
const TRUCK = {
  id: 1,
  chassisPlate: "JHG677",
  trailerPlate: "JHG765",
  type: "TOLVA",
  capacity: 50000,
  carrierId: 9,
  carrier: { id: 9, name: "Alejandro Santini" },
  cargoInsuranceStatus: "REJECTED",
  cargoInsuranceExpiration: "2026-09-18",
  habilitado: false,
};

function textField(page: import("@playwright/test").Page, label: string) {
  return page.locator("label", { hasText: label }).locator("xpath=following-sibling::div//input");
}
function selectField(page: import("@playwright/test").Page, label: string) {
  return page.locator("label", { hasText: label }).locator("xpath=following-sibling::div//select");
}

test.describe("Camiones — Logística no ve nada de seguro", () => {
  test("la lista no muestra 'Seguro de Carga' ni 'Estado Habilitación'", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([TRUCK])));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Alejandro Santini" }])));

    await page.goto("/trucks");

    await expect(page.getByText("JHG677")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Seguro de Carga" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Estado Habilitación" })).toHaveCount(0);
    await expect(page.getByText("Vencido")).toHaveCount(0);
    await expect(page.getByText("Inhabilitado")).toHaveCount(0);
  });

  test("crear un camión no exige datos de seguro (queda habilitado el botón Guardar)", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Alejandro Santini" }])));
    let postedBody: unknown = null;
    await page.route("**/api/trucks", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      postedBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 2 }), 201);
    });

    await page.goto("/trucks");
    await page.getByRole("button", { name: "Nuevo Camión" }).click();

    await expect(
      page.getByText("Seguro Obligatorio de la Carga", { exact: false }),
    ).toHaveCount(0);

    await textField(page, "Patente del Chasis").fill("AAA111");
    await textField(page, "Patente del Acoplado").fill("BBB222");
    await selectField(page, "Tipo de Camión").selectOption("BATEA");
    await textField(page, "Capacidad Útil").fill("30000");
    await selectField(page, "Empresa Transportista").selectOption("9");

    const guardar = page.getByRole("button", { name: "Guardar" });
    await expect(guardar).toBeEnabled();
    await guardar.click();

    await expect.poll(() => postedBody).not.toBeNull();
    expect((postedBody as any).cargoInsurancePolicy).toBeUndefined();
    expect((postedBody as any).cargoInsurancePhotoUrl).toBeUndefined();
  });
});

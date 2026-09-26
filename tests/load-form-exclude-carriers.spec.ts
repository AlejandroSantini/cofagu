import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Publicar Carga" — exclusión puntual de transportistas de un grupo.
 * Pedido de backend: al tildar un grupo, traer sus transportistas y
 * mostrarlos todos marcados por defecto; destildar alguno lo manda en
 * `excludedCarriers` (array de IDs) en el payload de creación del viaje —
 * no afecta al grupo original, solo a esta publicación puntual.
 */
const GROUP = { id: 1, name: "General", isGeneral: true };
const GROUP_WITH_MEMBERS = {
  id: 1,
  name: "General",
  isGeneral: true,
  members: [
    { id: 10, member_type: "carrier", name: "Transporte Alfa" },
    { id: 20, member_type: "carrier", name: "Transporte Beta" },
    { id: 30, member_type: "logistics", name: "Logística Gamma" },
  ],
};

async function publishBasics(page: import("@playwright/test").Page) {
  await page.getByPlaceholder("Ej: Buenos Aires").fill("Coop Urdinarrain");
  await page.getByPlaceholder("Ej: Rosario").fill("Cañuelas");
  const fillDate = async (labelText: string, value: string) => {
    const input = page.locator("label", { hasText: labelText }).locator("xpath=following-sibling::div//input");
    await input.fill(value);
  };
  await fillDate("Fecha de Carga", "2026-09-13");
  await fillDate("Fecha de Cupo", "2026-09-14");
  const timeInputs = page.locator('input[type="time"]');
  await timeInputs.nth(0).fill("08:00");
  await timeInputs.nth(1).fill("12:00");
  await page.getByPlaceholder("Ej: Soja, Maíz").fill("Soja");
  await page.getByPlaceholder("Ej: 500000").fill("50000");
}

test.describe("Publicar Carga — exclusión de transportistas por grupo", () => {
  test("muestra a todos los transportistas del grupo tildado, marcados por defecto (sin logísticas)", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([GROUP])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk(GROUP_WITH_MEMBERS)));
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();

    await expect(page.getByText("Transportistas Incluidos en este Viaje")).toBeVisible();
    const alfa = page.locator("label", { hasText: "Transporte Alfa" }).locator('input[type="checkbox"]');
    const beta = page.locator("label", { hasText: "Transporte Beta" }).locator('input[type="checkbox"]');
    await expect(alfa).toBeChecked();
    await expect(beta).toBeChecked();
    // Los miembros de tipo "logistics" no son transportistas a excluir.
    await expect(page.getByText("Logística Gamma")).toHaveCount(0);
  });

  test("destildar un transportista lo manda en excludedCarriers al publicar", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([GROUP])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk(GROUP_WITH_MEMBERS)));

    let postedBody: { excludedCarriers?: number[]; targetGroups?: unknown } | null = null;
    await page.route("**/api/trips*", (route) => {
      if (route.request().method() === "POST") {
        postedBody = JSON.parse(route.request().postData() || "{}");
        return fulfill(route, apiOk({ id: 1 }));
      }
      return fulfill(route, apiOk([]));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();
    await expect(page.getByText("Transportistas Incluidos en este Viaje")).toBeVisible();

    await page.locator("label", { hasText: "Transporte Beta" }).locator('input[type="checkbox"]').uncheck();

    await publishBasics(page);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect.poll(() => postedBody).not.toBeNull();
    expect(postedBody!.excludedCarriers).toEqual([20]);
  });

  test("sin destildar a nadie, excludedCarriers va vacío", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([GROUP])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk(GROUP_WITH_MEMBERS)));

    let postedBody: { excludedCarriers?: number[] } | null = null;
    await page.route("**/api/trips*", (route) => {
      if (route.request().method() === "POST") {
        postedBody = JSON.parse(route.request().postData() || "{}");
        return fulfill(route, apiOk({ id: 1 }));
      }
      return fulfill(route, apiOk([]));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();
    await expect(page.getByText("Transportistas Incluidos en este Viaje")).toBeVisible();

    await publishBasics(page);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect.poll(() => postedBody).not.toBeNull();
    expect(postedBody!.excludedCarriers).toEqual([]);
  });
});

import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

const GROUP = {
  id: 1,
  name: "Grupo Mixto Sur",
  description: "Grupo de prueba",
  members: [
    { id: "10", name: "Transportes SA", member_type: "carrier", carrier_id: 10, cuit: "30-11111111-1" },
    { id: "20", name: "Logística Interna", member_type: "logistics", user_id: 20, email: "log@cofagu.com" },
  ],
};

test.describe("Grupos de Transportistas", () => {
  test("el detalle de un grupo muestra integrantes de tipo mixto con su etiqueta", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([{ id: 1, name: GROUP.name, description: GROUP.description, members: [] }])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk(GROUP)));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([{ id: 30, name: "Transportes Nuevo" }])));
    await page.route("**/api/users*", (r) => fulfill(r, apiOk([{ id: 40, name: "Usuario Logística Nuevo", role: "LOGISTICS" }])));

    await page.goto("/groups/1");

    await expect(page.getByText("Transportes SA")).toBeVisible();
    await expect(page.getByText("Logística Interna")).toBeVisible();

    // Cada integrante lleva el badge (span) de su tipo
    await expect(page.locator("span").filter({ hasText: /^Transportista$/ })).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Logística$/ })).toBeVisible();
  });

  test("un grupo sin integrantes muestra el estado vacío", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([{ id: 2, name: "Grupo Vacío", description: "", members: [] }])));
    await page.route("**/api/groups/2", (r) => fulfill(r, apiOk({ id: 2, name: "Grupo Vacío", description: "", members: [] })));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/users*", (r) => fulfill(r, apiOk([])));

    await page.goto("/groups/2");
    await expect(page.getByText(/aún no tiene integrantes/i)).toBeVisible();
  });
});

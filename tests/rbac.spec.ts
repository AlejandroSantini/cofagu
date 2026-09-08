import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * `RoleGate` (src/components/RoleGate.tsx) esconde el contenido de una página
 * cuando el rol no está permitido, sin redirigir.
 */
test.describe("Control de acceso por rol (RoleGate)", () => {
  test("ADMIN ve la Gestión de Personal", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/users*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Gestión de Personal" })).toBeVisible();
  });

  test("CARRIER no ve la Gestión de Personal", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/users*", (r) => fulfill(r, apiOk([])));

    await page.goto("/users");
    // La ruta no redirige, pero el contenido protegido no se renderiza.
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole("heading", { name: "Gestión de Personal" })).toBeHidden();
  });

  test("EMPLOYEE no ve Empresas Transportistas", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/carriers");
    await expect(page.getByRole("heading", { name: "Empresas Transportistas" })).toBeHidden();
  });

  test("OPERATOR sí ve Empresas Transportistas", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/carriers");
    await expect(page.getByRole("heading", { name: "Empresas Transportistas" })).toBeVisible();
  });
});

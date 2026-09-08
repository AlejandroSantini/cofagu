import { test, expect } from "@playwright/test";
import { apiOk, apiError, fulfill, mockBaseline, loginAs, MOCK_USERS } from "./utils";

test.describe("Autenticación", () => {
  test("login con credenciales válidas entra al Panel de Control", async ({ page }) => {
    await mockBaseline(page);
    await page.route("**/api/users/login", (r) =>
      fulfill(r, apiOk({ user: MOCK_USERS.ADMIN, token: "e2e-token" })),
    );
    await page.route("**/api/loads", (r) => fulfill(r, apiOk([])));

    await page.goto("/login");
    await page.getByPlaceholder("usuario@cofagu.com").fill("admin@cofagu.com");
    await page.getByPlaceholder("••••••••").fill("un-password");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    await expect(page).toHaveURL(/localhost:3001\/$/);
    await expect(page.getByRole("heading", { name: "Panel de Control" })).toBeVisible();
  });

  test("login con credenciales inválidas muestra el error y no navega", async ({ page }) => {
    await mockBaseline(page);
    await page.route("**/api/users/login", (r) =>
      fulfill(r, apiError("Credenciales inválidas"), 401),
    );

    await page.goto("/login");
    await page.getByPlaceholder("usuario@cofagu.com").fill("admin@cofagu.com");
    await page.getByPlaceholder("••••••••").fill("mal");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("una ruta protegida sin sesión redirige al login", async ({ page }) => {
    await page.goto("/loads");
    await expect(page).toHaveURL(/\/login/);
  });

  test("un usuario obligado a cambiar contraseña queda bloqueado en esa pantalla", async ({ page }) => {
    await loginAs(page, "ADMIN", { mustChangePassword: true });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Actualizar Contraseña" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Panel de Control" })).toBeHidden();
  });

  test("cerrar sesión vuelve al login", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads", (r) => fulfill(r, apiOk([])));

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Panel de Control" })).toBeVisible();

    await page.getByRole("button", { name: "Cerrar Sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

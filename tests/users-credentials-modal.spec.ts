import { test, expect, type Page } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Los <Input>/<Select> del sistema de diseño no asocian el <label> con el
 * control por id (getByLabel no sirve) — mismo patrón ya usado en
 * tests/load-form-dates.spec.ts y tests/live/fixtures.ts.
 */
function textField(page: Page, labelText: string) {
  return page.locator("label", { hasText: labelText }).locator("xpath=following-sibling::div//input");
}
function selectField(page: Page, labelText: string) {
  return page.locator("label", { hasText: labelText }).locator("xpath=following-sibling::div//select");
}

/**
 * "Personal / Usuarios" (/users) — al crear un usuario nuevo, no había
 * forma de volver a ver el email/contraseña recién asignados para
 * reenviárselos a la persona (el form se limpiaba de inmediato). Pedido
 * explícito de un admin (por audio de WhatsApp) creando un usuario de
 * logística. Mismo patrón ya usado en CarriersPage.tsx al crear un
 * transportista: modal con "Copiar al portapapeles".
 */
test.describe("Personal / Usuarios — modal de credenciales al crear", () => {
  test("después de crear un usuario, muestra el email/contraseña para copiar", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/users", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/users/register", (r) =>
      fulfill(r, apiOk({ id: 99, name: "Nueva Logística", email: "logistica@cofagu.com", role: "LOGISTICS" })),
    );
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/users");
    await page.getByRole("button", { name: "Nuevo Usuario" }).click();

    await textField(page, "Nombre Completo").fill("Nueva Logística");
    await textField(page, "Correo Electrónico").fill("logistica@cofagu.com");
    await textField(page, "Contraseña").fill("clave-secreta-123");
    await selectField(page, "Rol de Usuario").selectOption("LOGISTICS");
    await page.getByRole("button", { name: "Crear Cuenta" }).click();

    await expect(page.getByText("Usuario creado con éxito")).toBeVisible();
    await expect(page.getByRole("heading", { name: "🔑 Credenciales de Acceso Creadas" })).toBeVisible();
    await expect(page.getByText("logistica@cofagu.com")).toBeVisible();
    await expect(page.getByText("clave-secreta-123")).toBeVisible();

    await page.getByRole("button", { name: "Copiar al portapapeles" }).click();
    await expect(page.getByText("Copiado")).toBeVisible();
  });

  test("al editar un usuario existente, no aparece el modal de credenciales", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/users", (r) =>
      fulfill(r, apiOk([{ id: 5, name: "Juan Balanza", email: "juan@cofagu.com", role: "EMPLOYEE" }])),
    );
    await page.route("**/api/users/5", (route) => {
      if (route.request().method() === "PUT") {
        return fulfill(route, apiOk({ id: 5, name: "Juan Balanza", email: "juan@cofagu.com", role: "EMPLOYEE" }));
      }
      return fulfill(route, apiOk({ id: 5, name: "Juan Balanza", email: "juan@cofagu.com", role: "EMPLOYEE" }));
    });
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/users");
    await page.getByText("Juan Balanza").click();
    await expect(page.getByRole("heading", { name: "Editar Personal" })).toBeVisible();

    await page.getByRole("button", { name: "Guardar Cambios" }).click();

    await expect(page.getByText("Usuario actualizado")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "🔑 Credenciales de Acceso Creadas" }),
    ).toHaveCount(0);
  });
});

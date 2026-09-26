import { test, expect, type Page } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Alta de transportistas — login dual y reutilización entre logísticas
 * (prompt de backend, 2026-09). El backend ya no devuelve 409 cuando una
 * logística carga un CUIT que otra logística ya dio de alta: lo vincula y
 * devuelve 200/201 igual. No hay forma confiable de distinguir "recién
 * creado" de "vinculado a uno ya existente" desde la respuesta, así que
 * para LOGISTICS se usa una frase que es correcta en los dos casos.
 */
function textField(page: Page, labelText: string) {
  return page.locator("label", { hasText: labelText }).locator("xpath=following-sibling::div//input");
}

test.describe("Alta de transportistas — mensaje según rol", () => {
  test("LOGISTICS: muestra 'vinculado a tu logística' (cubre creación y reutilización)", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/carriers", (route) => {
      if (route.request().method() !== "POST") return fulfill(route, apiOk([]));
      return fulfill(route, apiOk({ id: 99, name: "Transporte Compartido", cuit: "30-11111111-1", contactPhone: "3446662836" }));
    });

    await page.goto("/carriers");
    await page.getByRole("button", { name: "Nuevo Transportista" }).click();

    await textField(page, "Nombre / Razón Social").fill("Transporte Compartido");
    await textField(page, "CUIT").fill("30-11111111-1");
    await textField(page, "Teléfono de Contacto").fill("3446662836");

    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Transportista vinculado a tu logística con éxito")).toBeVisible();
    await expect(page.getByText("Transportista creado con éxito")).toHaveCount(0);
  });

  test("ADMIN: sigue mostrando 'creado con éxito' (sin cambios)", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/carriers", (route) => {
      if (route.request().method() !== "POST") return fulfill(route, apiOk([]));
      return fulfill(route, apiOk({ id: 100, name: "Transporte Nuevo", cuit: "30-22222222-2", contactPhone: "3446662837" }));
    });

    await page.goto("/carriers");
    await page.getByRole("button", { name: "Nuevo Transportista" }).click();

    await textField(page, "Nombre / Razón Social").fill("Transporte Nuevo");
    await textField(page, "CUIT").fill("30-22222222-2");
    await textField(page, "Teléfono de Contacto").fill("3446662837");

    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Transportista creado con éxito")).toBeVisible();
  });

  test("LOGISTICS: el email de contacto no aparece en el form (el teléfono alcanza)", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([])));

    await page.goto("/carriers");
    await page.getByRole("button", { name: "Nuevo Transportista" }).click();

    await expect(page.getByText("Email de Contacto (Usuario)")).toHaveCount(0);
    await expect(page.getByText("Teléfono de Contacto")).toBeVisible();
  });
});

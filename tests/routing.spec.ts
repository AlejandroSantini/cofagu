import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * `src/App.tsx` manda la ruta `/` a distintos destinos según el rol.
 * Estos tests fijan ese contrato.
 */
test.describe("Redirección de la home por rol", () => {
  test("PLAYERO cae en Control de Playa", async ({ page }) => {
    await loginAs(page, "PLAYERO");
    await page.route("**/api/loads/yard/loads*", (r) => fulfill(r, apiOk([])));

    await page.goto("/");

    await expect(page).toHaveURL(/\/yard$/);
    await expect(page.getByRole("heading", { name: "Control de Playa" })).toBeVisible();
  });

  test("TECHNICAL_CENTER cae en el Buscador de Camiones", async ({ page }) => {
    await loginAs(page, "TECHNICAL_CENTER");
    await page.route("**/api/loads/technical-center/loads/search*", (r) => fulfill(r, apiOk([])));

    await page.goto("/");

    await expect(page).toHaveURL(/\/technical-center-search$/);
    await expect(page.getByRole("heading", { name: "Buscador de Camiones" })).toBeVisible();
  });

  test("GAS_STATION cae en Cargas y Viajes", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    for (const p of ["**/api/loads*", "**/api/trips*", "**/api/drivers*", "**/api/trucks*"]) {
      await page.route(p, (r) => fulfill(r, apiOk([])));
    }

    await page.goto("/");
    await expect(page).toHaveURL(/\/loads$/);
  });

  test("CONTROL_VIAJES cae en Control de Viajes", async ({ page }) => {
    await loginAs(page, "CONTROL_VIAJES");

    await page.goto("/");
    await expect(page).toHaveURL(/\/control-viajes$/);
  });

  test("ADMIN se queda en el Panel de Control", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads", (r) => fulfill(r, apiOk([])));

    await page.goto("/");
    await expect(page).toHaveURL(/localhost:3001\/$/);
    await expect(page.getByRole("heading", { name: "Panel de Control" })).toBeVisible();
  });
});

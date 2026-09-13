import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Confirmado contra el backend real: cuando un viaje tiene tarifa
 * diferenciada por grupo, el `rate` que trae cada Load ya asignado NO
 * resuelve el grupo correcto — siempre devuelve la tarifa General, tanto
 * en postulaciones directas como mediadas por logística. Hasta que el
 * backend lo arregle, el usuario de Balanza (EMPLOYEE) solo debe ver la
 * columna Tarifa si viene `resolvedRate` (el campo que le vamos a pedir a
 * backend que resuelva bien) — nunca confiando en `rate`. Apenas backend
 * lo agregue, la columna aparece sola con el valor correcto: no hace
 * falta ningún otro cambio de frontend.
 */
test.describe("Balanza (EMPLOYEE) — columna Tarifa condicionada a resolvedRate", () => {
  test("sin resolvedRate: la columna Tarifa no aparece", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 65,
            tripId: 35,
            status: "ASSIGNED",
            origin: "Rosario",
            destination: "Nelson Regner",
            rate: 50, // tarifa General — no necesariamente la del grupo real del camión
            carrier: { name: "Alejandro Santini" },
          },
        ]),
      ),
    );

    // Para EMPLOYEE la pestaña "Asignados" ya es la default al montar.
    await page.goto("/loads");

    await expect(page.getByText("Rosario")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Tarifa" })).toHaveCount(0);
    await expect(page.getByText("$50")).toHaveCount(0);
  });

  test("con resolvedRate (simulando el fix de backend): la columna aparece con el valor correcto", async ({
    page,
  }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 65,
            tripId: 35,
            status: "ASSIGNED",
            origin: "Rosario",
            destination: "Nelson Regner",
            rate: 50, // sigue siendo la General (bug ya conocido)
            resolvedRate: 20, // pero backend ya manda la resuelta por grupo
            carrier: { name: "Alejandro Santini" },
          },
        ]),
      ),
    );

    await page.goto("/loads");

    await expect(page.getByRole("columnheader", { name: "Tarifa" })).toBeVisible();
    await expect(page.getByText("$20")).toBeVisible();
    await expect(page.getByText("$50")).toHaveCount(0);
  });

  test("CARRIER sigue viendo la columna Tarifa (no afectado por el cambio)", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 65,
            tripId: 35,
            status: "ASSIGNED",
            origin: "Rosario",
            destination: "Nelson Regner",
            rate: 60000,
            carrier: { name: "Alejandro Santini" },
          },
        ]),
      ),
    );

    await page.goto("/loads");
    await page.getByRole("button", { name: "Asignados" }).click();

    await expect(page.getByRole("columnheader", { name: "Tarifa" })).toBeVisible();
    await expect(page.getByText("$60.000")).toBeVisible();
  });
});

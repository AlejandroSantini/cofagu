import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

const card = (title: string) => `[data-testid="stat-card"][data-title="${title}"]`;

test.describe("Panel de Control — KPIs", () => {
  test("los contadores se calculan a partir de las cargas", async ({ page }) => {
    await loginAs(page, "ADMIN");

    const loads = [
      { id: 1, status: "ACTIVE", origin: "Campo 1", destination: "Planta", rate: 1000, contingencies: [] },
      { id: 2, status: "ASSIGNED", origin: "Campo 2", destination: "Planta", rate: 1000, contingencies: [] },
      { id: 3, status: "IN_PROGRESS", origin: "Campo 3", destination: "Planta", rate: 1000, contingencies: [{ id: 1 }] },
      { id: 4, status: "COMPLETED", origin: "Campo 4", destination: "Planta", rate: 1000, contingencies: [] },
      { id: 5, status: "COMPLETED", origin: "Campo 5", destination: "Planta", rate: 1000, contingencies: [{ id: 2 }, { id: 3 }] },
      { id: 6, status: "CANCELLED", origin: "Campo 6", destination: "Planta", rate: 1000, contingencies: [] },
    ];
    await page.route("**/api/loads", (r) => fulfill(r, apiOk(loads)));

    await page.goto("/");

    await expect(page.locator(card("Pendientes Asignación"))).toHaveAttribute("data-value", "1");
    await expect(page.locator(card("Viajes en Curso"))).toHaveAttribute("data-value", "2");
    await expect(page.locator(card("Viajes Completados"))).toHaveAttribute("data-value", "2");
    await expect(page.locator(card("Contingencias Activas"))).toHaveAttribute("data-value", "3");
  });

  test("con cero cargas todos los KPIs quedan en 0", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads", (r) => fulfill(r, apiOk([])));

    await page.goto("/");

    for (const t of ["Pendientes Asignación", "Viajes en Curso", "Viajes Completados", "Contingencias Activas"]) {
      await expect(page.locator(card(t))).toHaveAttribute("data-value", "0");
    }
  });

  test("el botón 'Publicar Nueva Carga' lleva a Cargas y Viajes", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/trips*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/drivers*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));

    await page.goto("/");
    await page.getByRole("button", { name: "Publicar Nueva Carga" }).click();
    await expect(page).toHaveURL(/\/loads$/);
  });
});

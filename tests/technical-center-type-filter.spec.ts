import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido explícito: el filtro "Tipo" del Buscador de Camiones (Centro
 * Agrotécnico) usaba pestañas (FilterPills) — se pide que sea un selector
 * desplegable, como el filtro de tipo de Camiones (TrucksPage).
 */
const RESULTS = [
  { id: 1, plate: "AA123BB", truckType: "BATEA", carrierName: "Transporte A", driverName: "Juan", driverPhone: "111", destination: "Rosario", status: "IN_PROGRESS", ctg: "1" },
  { id: 2, plate: "AB456CD", truckType: "TOLVA", carrierName: "Transporte B", driverName: "Pedro", driverPhone: "222", destination: "Cañuelas", status: "ASSIGNED", ctg: null },
];

test.describe("Buscador de Camiones (Centro Agrotécnico) — filtro por tipo", () => {
  test("el filtro de tipo es un selector, no pestañas", async ({ page }) => {
    await loginAs(page, "TECHNICAL_CENTER");
    await page.route("**/api/loads/technical-center/loads/search*", (r) => fulfill(r, apiOk(RESULTS)));

    await page.goto("/technical-center-search");

    await expect(page.getByRole("combobox")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Batea" })).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveValue("ALL");
  });

  test("elegir un tipo en el selector filtra la tabla", async ({ page }) => {
    await loginAs(page, "TECHNICAL_CENTER");
    await page.route("**/api/loads/technical-center/loads/search*", (r) => fulfill(r, apiOk(RESULTS)));

    await page.goto("/technical-center-search");
    await expect(page.getByText("AA123BB")).toBeVisible();
    await expect(page.getByText("AB456CD")).toBeVisible();

    await page.getByRole("combobox").selectOption("BATEA");

    await expect(page.getByText("AA123BB")).toBeVisible();
    await expect(page.getByText("AB456CD")).toHaveCount(0);
  });
});

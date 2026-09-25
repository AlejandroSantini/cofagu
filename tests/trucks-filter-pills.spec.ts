import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Camiones" (/trucks) — el filtro "Filtrar por Tipo de Camión" es un
 * <Select> pegado a la derecha del header de la tabla (junto al total),
 * mismo criterio de filtrado que antes.
 */
const TRUCKS = [
  { id: 1, chassisPlate: "AAA111", trailerPlate: "AAA112", type: "TOLVA", capacity: 30000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
  { id: 2, chassisPlate: "BBB111", trailerPlate: "BBB112", type: "BATEA", capacity: 28000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
];

test.describe("Camiones — filtro por tipo", () => {
  test("elegir un tipo en el selector filtra la tabla", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk(TRUCKS)));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));

    await page.goto("/trucks");

    await expect(page.getByText("AAA111")).toBeVisible();
    await expect(page.getByText("BBB111")).toBeVisible();
    await expect(page.getByText("Total: 2", { exact: true })).toBeVisible();

    const typeSelect = page.locator("select");

    await typeSelect.selectOption("BATEA");

    await expect(page.getByText("BBB111")).toBeVisible();
    await expect(page.getByText("AAA111")).toHaveCount(0);
    await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();

    await typeSelect.selectOption("ALL");
    await expect(page.getByText("AAA111")).toBeVisible();
    await expect(page.getByText("BBB111")).toBeVisible();
    await expect(page.getByText("Total: 2", { exact: true })).toBeVisible();
  });
});

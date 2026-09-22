import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Camiones" (/trucks) — el filtro "Filtrar por Tipo de Camión" (antes un
 * <Select> dentro de una tarjeta vacía) pasa a ser un componente nuevo,
 * `FilterPills`: chips clickeables, mismo criterio de filtrado.
 */
const TRUCKS = [
  { id: 1, chassisPlate: "AAA111", trailerPlate: "AAA112", type: "TOLVA", capacity: 30000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
  { id: 2, chassisPlate: "BBB111", trailerPlate: "BBB112", type: "BATEA", capacity: 28000, carrierId: 9, carrier: { id: 9, name: "Transporte A" }, cargoInsuranceStatus: "APPROVED", cargoInsurancePolicy: "1", cargoInsurancePhotoUrl: "x" },
];

test.describe("Camiones — filtro por tipo (FilterPills)", () => {
  test("clickear un chip filtra la tabla, sin necesidad de un <select>", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk(TRUCKS)));
    await page.route("**/api/carriers", (r) => fulfill(r, apiOk([{ id: 9, name: "Transporte A" }])));

    await page.goto("/trucks");

    await expect(page.getByText("AAA111")).toBeVisible();
    await expect(page.getByText("BBB111")).toBeVisible();

    await page.getByRole("button", { name: "Batea", exact: true }).click();

    await expect(page.getByText("BBB111")).toBeVisible();
    await expect(page.getByText("AAA111")).toHaveCount(0);

    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await expect(page.getByText("AAA111")).toBeVisible();
    await expect(page.getByText("BBB111")).toBeVisible();
  });
});

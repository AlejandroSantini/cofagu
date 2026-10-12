import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Pedido real (WhatsApp, 2026-10-12): en el Buscador de Camiones del
 * Centro Agrotécnico, que también aparezca el teléfono del transportista
 * (ya estaba el del chofer, con botón "Llamar").
 *
 * `carrierPhone` es opcional en el tipo — pendiente de que backend lo
 * agregue a GET /loads/technical-center/loads/search (hoy no lo manda,
 * confirmado contra el backend real). Mientras tanto, sin ese campo no
 * debe romper ni mostrar un botón "Llamar" vacío.
 */
const RESULT_WITH_PHONE = {
  id: 1,
  plate: "AA123BB",
  truckType: "BATEA",
  carrierName: "Transporte A",
  carrierPhone: "3446123456",
  driverName: "Juan",
  driverPhone: "3446111111",
  destination: "Rosario",
  status: "IN_PROGRESS",
  ctg: "1",
};

test.describe("Buscador de Camiones (Centro Agrotécnico) — teléfono del transportista", () => {
  test("muestra 'Llamar' con el teléfono del transportista, además del chofer", async ({ page }) => {
    await loginAs(page, "TECHNICAL_CENTER");
    await page.route("**/api/loads/technical-center/loads/search*", (r) => fulfill(r, apiOk([RESULT_WITH_PHONE])));

    await page.goto("/technical-center-search");

    const links = page.getByRole("link", { name: "Llamar" });
    await expect(links).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Llamar" }).nth(0)).toHaveAttribute("href", "tel:3446123456");
    await expect(page.getByRole("link", { name: "Llamar" }).nth(1)).toHaveAttribute("href", "tel:3446111111");
  });

  test("sin carrierPhone (backend todavía no lo manda), no rompe ni muestra un botón vacío", async ({ page }) => {
    await loginAs(page, "TECHNICAL_CENTER");
    await page.route("**/api/loads/technical-center/loads/search*", (r) =>
      fulfill(r, apiOk([{ ...RESULT_WITH_PHONE, carrierPhone: undefined }])),
    );

    await page.goto("/technical-center-search");

    await expect(page.getByText("Transporte A")).toBeVisible();
    await expect(page.getByRole("link", { name: "Llamar" })).toHaveCount(1); // solo el del chofer
  });
});

import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * "Auditoría de Seguros" (/documents) — zoom en la foto de la póliza.
 * Pedido por audio de WhatsApp: la foto que suben los transportistas a
 * veces no se lee bien, y el zoom nativo del navegador está deshabilitado
 * en toda la app (viewport user-scalable=no), así que hace falta un toggle
 * de zoom manual dentro del modal "Ver Documento".
 */
// 2x2 PNG transparente real, para que el <img> tenga dimensiones y Playwright
// lo considere visible (una URL externa fake queda "rota" y sin tamaño).
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mNk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const TRUCKS = [
  {
    id: 1,
    chassisPlate: "AAA123",
    type: "ACOPLADO",
    capacity: 30000,
    carrierId: 10,
    carrier: { id: 10, name: "Ledria" },
    cargoInsurancePhotoUrl: TINY_PNG,
    cargoInsuranceExpiration: "2026-12-29",
    cargoInsuranceStatus: "APPROVED",
  },
];

test.describe("Auditoría de Seguros — zoom en el documento", () => {
  test("tocar la imagen alterna entre tamaño normal y agrandado", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk(TRUCKS)));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");
    await page.getByRole("button", { name: "Ver Documento" }).click();

    await expect(page.getByText("Tocá la imagen para agrandarla al máximo")).toBeVisible();

    const img = page.getByAltText("Documento");
    await img.click();

    await expect(page.getByText("Tocá la imagen para achicar")).toBeVisible();

    await img.click();
    await expect(page.getByText("Tocá la imagen para agrandarla al máximo")).toBeVisible();
  });

  test("cerrar el modal resetea el zoom para la próxima vez", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk(TRUCKS)));
    await page.route("**/api/carriers*", (r) => fulfill(r, apiOk([])));

    await page.goto("/documents");
    await page.getByRole("button", { name: "Ver Documento" }).click();
    await page.getByAltText("Documento").click();
    await expect(page.getByText("Tocá la imagen para achicar")).toBeVisible();

    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.getByRole("button", { name: "Ver Documento" }).click();

    await expect(page.getByText("Tocá la imagen para agrandarla al máximo")).toBeVisible();
  });
});

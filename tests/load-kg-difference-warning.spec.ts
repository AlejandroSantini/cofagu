import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Aviso de "Diferencia de Kilos Faltantes" (kg descargados < kg cargados).
 *
 * Reporte real (WhatsApp, 2026-09-29): un transportista tipeó mal los kg
 * de descarga (30,82 en vez de 30.820) y el aviso decía "Transportista
 * Bloqueado" — generaba pánico ("no sé qué hacer en este caso"). Probado
 * contra el backend real (viaje E2E descartable): ese texto era engañoso,
 * NO hay ningún bloqueo real — el mismo transportista se pudo postular sin
 * problema a otro viaje con la diferencia todavía sin ajustar. Se saca la
 * mención a "bloqueado" y se deja claro que es solo un aviso informativo
 * (la diferencia se cobra/ajusta en cuenta corriente).
 */
const LOAD_WITH_KG_DIFFERENCE = {
  id: 300,
  tripId: 50,
  status: "COMPLETED",
  origin: "Córdoba",
  destination: "Rosario",
  cereal: "Soja",
  carrierId: 10,
  carrier: { id: 10, name: "Transporte Juan" },
  driver: { name: "Juan Perez" },
  truck: { chassisPlate: "AB123CD" },
  loadedWeight: 30820,
  unloadedWeight: 30.82,
  differenceAdjusted: false,
  applications: [],
};

test.describe("Aviso de diferencia de kilos — sin bloquear al transportista", () => {
  test("ADMIN ve el aviso sin la mención a 'bloqueado', y puede marcarlo como ajustado", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads/300", (r) => fulfill(r, apiOk(LOAD_WITH_KG_DIFFERENCE)));
    let putBody: unknown = null;
    await page.route("**/api/loads/300", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ ...LOAD_WITH_KG_DIFFERENCE, differenceAdjusted: true }));
    });

    await page.goto("/loads/300?type=load");

    await expect(page.getByText(/Diferencia de Kilos Faltantes Detectada/)).toBeVisible();
    await expect(page.getByText("Pendiente de Ajuste", { exact: true })).toBeVisible();
    await expect(page.getByText(/Transportista Bloqueado/)).toHaveCount(0);
    await expect(page.getByText(/no bloquea al transportista/)).toBeVisible();

    await page.getByRole("button", { name: "Marcar como Ajustado / Facturado en Cuenta Corriente" }).click();
    await expect.poll(() => putBody).toEqual({ differenceAdjusted: true });
  });

  test("EMPLOYEE (Balanza) también ve el aviso", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads/300", (r) => fulfill(r, apiOk(LOAD_WITH_KG_DIFFERENCE)));

    await page.goto("/loads/300?type=load");

    await expect(page.getByText(/Diferencia de Kilos Faltantes Detectada/)).toBeVisible();
    await expect(page.getByText(/Transportista Bloqueado/)).toHaveCount(0);
  });

  test("sin diferencia de kilos, no se muestra ningún aviso", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/loads/300", (r) =>
      fulfill(r, apiOk({ ...LOAD_WITH_KG_DIFFERENCE, unloadedWeight: 30820 })),
    );

    await page.goto("/loads/300?type=load");

    await expect(page.getByText(/Diferencia de Kilos Faltantes Detectada/)).toHaveCount(0);
  });
});

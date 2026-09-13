import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug reportado: al publicar una carga con Fecha de Carga = hoy y Fecha de
 * Cupo = mañana, el detalle mostraba ambas fechas un día antes.
 *
 * Causa: `new Date("YYYY-MM-DD")` (el valor de un <input type="date">) se
 * interpreta como medianoche UTC. En Argentina (UTC-3) eso cae en las 21hs
 * del día anterior, así que cualquier `toLocaleDateString('es-AR')`
 * posterior mostraba un día antes del elegido.
 *
 * Fijamos la zona horaria del browser a la de Argentina para reproducir
 * exactamente las condiciones del usuario real, sin depender de en qué
 * huso horario corra la máquina que ejecuta los tests.
 */
test.use({ timezoneId: "America/Argentina/Buenos_Aires" });

test.describe("Publicar Carga — fechas", () => {
  test("Fecha de Carga y Fecha de Cupo se envían y se muestran en el día elegido, no un día antes", async ({
    page,
  }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) =>
      fulfill(r, apiOk([{ id: 1, name: "General", isGeneral: true }])),
    );

    let postedBody: { loadingDate: string; quotaDate: string } | null = null;
    await page.route("**/api/trips*", (route) => {
      if (route.request().method() === "POST") {
        postedBody = JSON.parse(route.request().postData() || "{}");
        return fulfill(route, apiOk({ id: 1 }));
      }
      return fulfill(route, apiOk([]));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();

    const fillDate = async (labelText: string, value: string) => {
      const input = page
        .locator("label", { hasText: labelText })
        .locator("xpath=following-sibling::div//input");
      await input.fill(value);
    };

    await page.getByPlaceholder("Ej: Buenos Aires").fill("Coop Urdinarrain");
    await page.getByPlaceholder("Ej: Rosario").fill("Cañuelas");
    await fillDate("Fecha de Carga", "2026-09-13");
    await fillDate("Fecha de Cupo", "2026-09-14");

    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill("08:00");
    await timeInputs.nth(1).fill("12:00");

    await page.getByPlaceholder("Ej: Soja, Maíz").fill("Soja");
    await page.getByPlaceholder("Ej: 500000").fill("50000");

    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect.poll(() => postedBody).not.toBeNull();
    const loadingDateShown = new Date(postedBody!.loadingDate).toLocaleDateString("es-AR");
    const quotaDateShown = new Date(postedBody!.quotaDate).toLocaleDateString("es-AR");
    expect(loadingDateShown).toBe("13/9/2026");
    expect(quotaDateShown).toBe("14/9/2026");
  });
});

import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reportado por audio de WhatsApp: la app le pedía el seguro de carga a
 * LOGISTICS, pero eso es responsabilidad del transportista, no de quien
 * postula en su nombre. El frontend ya evita mostrar camiones "bloqueados
 * por seguro" a logística en los selects — pero si el backend igual
 * rechaza la postulación (mensaje con "seguro"/"póliza"), antes se
 * redirigía a LOGISTICS a /trucks a las 3 segundos, como si tuviera que
 * arreglar algo ahí (no le corresponde, y ni siquiera tiene acceso normal
 * a esa gestión). Ahora, para LOGISTICS, ese caso muestra un mensaje claro
 * y NO redirige.
 */
const TRIP = {
  id: 1,
  status: "ACTIVE",
  origin: "Campo A",
  destination: "Planta",
  maxTrucks: 1,
  applications: [],
};

test.describe("LOGISTICS — error de seguro de carga al postular", () => {
  test("muestra mensaje claro y no redirige a /trucks", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP)));
    await page.route("**/api/carriers", (r) =>
      fulfill(r, apiOk([{ id: 50, name: "Transporte Tercero" }])),
    );
    await page.route("**/api/carriers/50/drivers", (r) =>
      fulfill(r, apiOk([{ id: 1, name: "Chofer Tercero", dni: "12345678", carrierId: 50 }])),
    );
    await page.route("**/api/carriers/50/trucks", (r) =>
      fulfill(r, apiOk([{ id: 1, chassisPlate: "AB123CD", type: "ACOPLADO", carrierId: 50 }])),
    );
    // Se dispara al abrir el modal (antes de elegir transportista en la
    // cascada) — sin esto, availableTrucks queda vacío y el botón
    // "Confirmar" no se habilita nunca, aunque la cascada esté completa.
    await page.route("**/api/trucks*", (r) =>
      fulfill(r, apiOk([{ id: 1, chassisPlate: "AB123CD", type: "ACOPLADO", carrierId: 50 }])),
    );
    await page.route("**/api/drivers*", (r) =>
      fulfill(r, apiOk([{ id: 1, name: "Chofer Tercero", dni: "12345678", carrierId: 50 }])),
    );
    await page.route("**/api/trips/1/apply", (r) =>
      fulfill(
        r,
        { success: false, message: "El camión no tiene el seguro de carga aprobado" },
        400,
      ),
    );

    await page.goto("/loads/1?type=trip");
    await page.getByRole("button", { name: "Postularse a este viaje" }).click();

    const selectField = (label: string) =>
      page.locator("label", { hasText: label }).locator("xpath=following-sibling::div//select");

    await selectField("Transportista").selectOption("50");
    await expect
      .poll(() => selectField("Chofer Habilitado").locator("option").count())
      .toBeGreaterThan(1);
    await selectField("Chofer Habilitado").selectOption("1");
    await selectField("Camión Flota").selectOption("1");

    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(
      page.getByText(
        "Eso lo gestiona el transportista con la cooperativa — avisale para que lo actualice.",
      ),
    ).toBeVisible();

    // No debe redirigir: ni ahora ni después de esperar el timeout de 3s
    // que sí aplica para otros roles.
    await page.waitForTimeout(3500);
    await expect(page).toHaveURL(/\/loads\/1/);
  });
});

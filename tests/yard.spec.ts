import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

const YARD_LOAD = {
  id: 99,
  status: "ASSIGNED",
  truck: { chassisPlate: "AB123CD" },
  driver: { name: "Pepe Grillo", dni: "12345678" },
  carrier: { name: "Logística X" },
  // El endpoint de playa devuelve la carga; cereal / franja horaria / ruta
  // vienen anidados en `trip`.
  trip: {
    origin: "Campo La Esperanza",
    destination: "Planta Urdinarrain",
    cereal: "Maíz",
    loadingTimeStart: "08:00",
    loadingTimeEnd: "10:00",
  },
};

test.describe("Control de Playa", () => {
  test("lista los camiones asignados y permite rechazar uno", async ({ page }) => {
    await loginAs(page, "PLAYERO");
    await page.route("**/api/loads/yard/loads*", (r) => fulfill(r, apiOk([YARD_LOAD])));

    let rejectBody: { reason?: string } | null = null;
    await page.route("**/api/loads/99/reject", (route) => {
      rejectBody = JSON.parse(route.request().postData() || "{}");
      return fulfill(route, apiOk({ id: 99, status: "REJECTED" }));
    });

    await page.goto("/yard");

    // La fila del camión se ve
    await expect(page.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText("Pepe Grillo")).toBeVisible();
    await expect(page.getByText("Logística X")).toBeVisible();

    // Cereal y franja horaria (vienen de load.trip)
    await expect(page.getByText("Maíz")).toBeVisible();
    await expect(page.getByText("08:00 - 10:00 hs")).toBeVisible();

    // Abrir el modal de rechazo
    await page.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByRole("heading", { name: "Rechazar Carga" })).toBeVisible();

    // El confirmar está deshabilitado hasta que haya un motivo
    const confirm = page.getByRole("button", { name: "Confirmar Rechazo" });
    await expect(confirm).toBeDisabled();

    await page
      .getByPlaceholder("Ej: Llegó fuera de horario establecido, documentación incompleta...")
      .fill("Camión sin documentación");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // El backend recibió el motivo
    await expect.poll(() => rejectBody?.reason).toBe("Camión sin documentación");
    await expect(page.getByText("Carga rechazada correctamente")).toBeVisible();
  });

  test("muestra el estado vacío cuando no hay camiones", async ({ page }) => {
    await loginAs(page, "PLAYERO");
    await page.route("**/api/loads/yard/loads*", (r) => fulfill(r, apiOk([])));

    await page.goto("/yard");
    await expect(page.getByRole("heading", { name: "Control de Playa" })).toBeVisible();
    await expect(page.getByText("No se encontraron camiones en la playa de camiones.")).toBeVisible();
  });
});

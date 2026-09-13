import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Item 2: notificación de cancelación de carga (TRIP_CANCELLED).
 * El backend ahora emite este tipo; el frontend debe renderizarla con un
 * ícono distintivo (antes caía al ícono genérico por default).
 */
test.describe("Notificaciones — tipos nuevos", () => {
  test("TRIP_CANCELLED se muestra con ícono de cancelación", async ({ page }) => {
    await loginAs(page, "CARRIER");
    await page.route("**/api/notifications", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: "n1",
            userId: "4",
            type: "TRIP_CANCELLED",
            title: "Viaje Cancelado",
            message: "El viaje Campo A → Planta fue cancelado por el operador.",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ]),
      ),
    );

    await page.goto("/notifications");

    const item = page.locator("li", { hasText: "Viaje Cancelado" });
    await expect(item).toBeVisible();
    await expect(item.locator("svg.text-rose-500")).toBeVisible();
  });

  test("APPLICATION_ACCEPTED se muestra con ícono de éxito", async ({ page }) => {
    await loginAs(page, "LOGISTICS");
    await page.route("**/api/notifications", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: "n2",
            userId: "7",
            type: "APPLICATION_ACCEPTED",
            title: "Postulación Aceptada",
            message: "Tu postulación fue aceptada.",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ]),
      ),
    );

    await page.goto("/notifications");

    const item = page.locator("li", { hasText: "Postulación Aceptada" });
    await expect(item).toBeVisible();
    await expect(item.locator("svg.text-green-500")).toBeVisible();
  });
});

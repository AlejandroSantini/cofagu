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

  /**
   * Confirmado contra el backend real: al rechazar un camión en la playa
   * (origen, por no llegar a horario), el tipo de notificación es
   * TRIP_REJECTED. El texto del mensaje hoy dice mal "rechazado en
   * destino" (pendiente de que backend lo corrija) y el transportista no
   * recibe ninguna notificación — ambos son bugs de backend, no de acá.
   * Este test solo cubre que el ícono ya está listo para ese tipo.
   */
  test("TRIP_REJECTED se muestra con ícono de rechazo", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/notifications", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: "n3",
            userId: "1",
            type: "TRIP_REJECTED",
            title: "🚨 Viaje Rechazado",
            message: "El camión AB123CD (Chofer: Alejandro Santini) ha sido reportado como rechazado en destino.",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ]),
      ),
    );

    await page.goto("/notifications");

    const item = page.locator("li", { hasText: "Viaje Rechazado" });
    await expect(item).toBeVisible();
    await expect(item.locator("svg.text-rose-500")).toBeVisible();
  });
});

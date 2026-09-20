import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs, mockGet } from "./utils";

/**
 * ADMIN — borrado definitivo de publicaciones viejas.
 *
 * Antes, apenas un viaje/carga pasaba a CANCELLED o REJECTED, el botón de
 * acción desaparecía del todo: no había forma de eliminarlo, quedaba
 * "flotando" para siempre generando confusión (pedido explícito: el admin
 * necesita poder borrar cualquier publicación que no haya completado todos
 * sus cupos, "cuando quiera"). Ahora ADMIN ve "Eliminar Definitivamente"
 * para CANCELLED/REJECTED. COMPLETED sigue sin ninguna acción de borrado
 * (protege el historial real de viajes que sí se hicieron), y lo que sigue
 * activo se sigue cancelando con "Cancelar Viaje Completo"/"Cancelar Carga".
 *
 * Confirmado contra el backend real: `DELETE /trips/:id` y `DELETE
 * /loads/:id` hacen soft-delete en cascada (`deletedAt` + status CANCELLED
 * en el viaje, sus cargas y postulaciones), sin conflictos de FK. Los
 * listados (`GET /trips`, `GET /loads`) filtran `deletedAt: null`
 * incondicionalmente, así que lo borrado no puede reaparecer en ningún tab.
 * El backend además agregó su propia barrera server-side: un DELETE sobre
 * algo COMPLETED (la carga misma, o un viaje con alguna carga COMPLETED)
 * devuelve 400 — el frontend nunca debería llegar a pedirlo porque el botón
 * no se muestra en ese caso, pero si algo cambia de estado en el medio,
 * el error ya viene manejado por `getErrorMessage` en el catch genérico.
 */
const baseTrip = {
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 1,
  cereal: "Soja",
  applications: [],
};

test.describe("ADMIN — borrado definitivo de publicaciones", () => {
  test("viaje CANCELLED: aparece 'Eliminar Definitivamente' y no 'Cancelar Viaje Completo'", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockGet(page, "**/api/trips/1", { ...baseTrip, id: 1, status: "CANCELLED" });
    let deleteCalled = false;
    await page.route("**/api/trips/1", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleteCalled = true;
      return fulfill(route, apiOk(null));
    });

    await page.goto("/loads/1?type=trip");

    await expect(page.getByRole("button", { name: "Eliminar Definitivamente" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar Viaje Completo" })).toHaveCount(0);

    await page.getByRole("button", { name: "Eliminar Definitivamente" }).click();
    await expect(
      page.getByText("Esta acción es permanente y no se puede deshacer."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Confirmar Eliminación" }).click();

    await expect.poll(() => deleteCalled).toBe(true);
    await expect(page.getByText("Carga cancelada/eliminada correctamente")).toBeVisible();
    await expect(page).toHaveURL("/loads");
  });

  test("viaje REJECTED: también se puede eliminar definitivamente", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockGet(page, "**/api/trips/2", { ...baseTrip, id: 2, status: "REJECTED" });
    let deleteCalled = false;
    await page.route("**/api/trips/2", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleteCalled = true;
      return fulfill(route, apiOk(null));
    });

    await page.goto("/loads/2?type=trip");

    await expect(page.getByRole("button", { name: "Eliminar Definitivamente" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar Definitivamente" }).click();
    await page.getByRole("button", { name: "Confirmar Eliminación" }).click();

    await expect.poll(() => deleteCalled).toBe(true);
  });

  test("viaje COMPLETED: ADMIN no tiene ninguna acción de borrado", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockGet(page, "**/api/trips/3", { ...baseTrip, id: 3, status: "COMPLETED" });

    await page.goto("/loads/3?type=trip");

    await expect(page.getByText("Campo A")).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar Definitivamente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar Viaje Completo" })).toHaveCount(0);
  });

  test("viaje ACTIVE sin cupos completados: ADMIN lo sigue pudiendo cancelar/borrar", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockGet(page, "**/api/trips/4", { ...baseTrip, id: 4, status: "ACTIVE", loads: [] });
    let deleteCalled = false;
    await page.route("**/api/trips/4", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleteCalled = true;
      return fulfill(route, apiOk(null));
    });

    await page.goto("/loads/4?type=trip");

    await expect(page.getByRole("button", { name: "Cancelar Viaje Completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar Definitivamente" })).toHaveCount(0);

    await page.getByRole("button", { name: "Cancelar Viaje Completo" }).click();
    await expect(
      page.getByText("¿Estás seguro de que deseas cancelar esta publicación?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar Carga" }).click();

    await expect.poll(() => deleteCalled).toBe(true);
  });

  test("viaje con un camión ya EN CURSO: cancelar no lo borra ni lo afecta", async ({ page }) => {
    // Reportado: "¿y si esa publicación no completa se cancela y ya salieron
    // algunos trips?" — antes, si ningún cupo estaba COMPLETED todavía, el
    // botón borraba el viaje entero vía DELETE /trips/:id, afectando también
    // a los camiones IN_PROGRESS (ya en ruta con carga). Ahora, cualquier
    // sub-load que no esté CANCELLED (asignado, demorado, en curso o
    // completado) bloquea el borrado del viaje completo.
    await loginAs(page, "ADMIN");
    await mockGet(page, "**/api/trips/5", {
      ...baseTrip,
      id: 5,
      status: "ACTIVE",
      maxTrucks: 2,
      loads: [
        { id: 500, status: "IN_PROGRESS", carrierId: 10, truckId: 5 },
      ],
    });
    let deleteTripCalled = false;
    let deleteLoadCalled = false;
    await page.route("**/api/trips/5", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleteTripCalled = true;
      return fulfill(route, apiOk(null));
    });
    await page.route("**/api/loads/500", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleteLoadCalled = true;
      return fulfill(route, apiOk(null));
    });

    await page.goto("/loads/5?type=trip");

    await page.getByRole("button", { name: "Cancelar Viaje Completo" }).click();
    await page.getByRole("button", { name: "Cancelar Carga" }).click();

    await expect(
      page.getByText(
        "Este viaje ya tiene camiones asignados, en curso o completados — no se puede cancelar la publicación completa sin afectarlos.",
      ),
    ).toBeVisible();

    // Ni el viaje ni el camión en curso se tocaron.
    await expect.poll(() => deleteTripCalled).toBe(false);
    await expect.poll(() => deleteLoadCalled).toBe(false);
  });
});

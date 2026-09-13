import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug reportado: un transportista que ya completó un viaje con uno de sus
 * camiones en una publicación no podía volver a postularse (con el mismo
 * camión u otro) en ESA MISMA publicación, aunque quedara cupo. Confirmado
 * contra el backend real que la API sí permite volver a postularse — el
 * bug estaba en el frontend: `appliedTruckIds` en LoadDetails.tsx trataba
 * cualquier Application con status !== 'CANCELLED' como "camión ocupado",
 * sin mirar que `tripStatus` ya fuera 'COMPLETED'.
 */
const TRIP_WITH_COMPLETED_TRUCK = {
  id: 1,
  status: "ACTIVE",
  origin: "Campo A",
  destination: "Planta",
  rate: 5000,
  maxTrucks: 2,
  cuposPendientes: 1,
  applications: [
    {
      id: 500,
      status: "ACCEPTED",
      tripStatus: "COMPLETED",
      carrierId: 10,
      driverId: 3,
      truckId: 5,
      carrier: { id: 10, name: "Transporte Juan" },
      driver: { id: 3, name: "Juan Perez", dni: "30111222" },
      truck: { id: 5, chassisPlate: "AB123CD" },
    },
  ],
  loads: [],
};

test.describe("Volver a postularse tras completar un viaje", () => {
  test('el botón "Postularse a este viaje" sigue visible con un camión ya completado', async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP_WITH_COMPLETED_TRUCK)));
    // El backend real deja ver de nuevo el camión/chofer ya usado una vez
    // que su viaje anterior está COMPLETED (confirmado contra producción).
    await page.route("**/api/drivers*", (r) =>
      fulfill(r, apiOk([{ id: 3, name: "Juan Perez", dni: "30111222", carrierId: 10 }])),
    );
    await page.route("**/api/trucks*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 5,
            chassisPlate: "AB123CD",
            type: "TOLVA",
            carrierId: 10,
            cargoInsuranceStatus: "APPROVED",
          },
        ]),
      ),
    );

    await page.goto("/loads/1?type=trip");

    const applyButton = page.getByRole("button", { name: "Postularse a este viaje" });
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // El modal no debe mostrar el aviso de "flota completa" ni ocultar el camión.
    await expect(page.getByText(/Todos los camiones de tu flota ya están postulados/)).toHaveCount(0);
    await expect(page.getByRole("combobox").last()).toContainText("AB123CD");

    await page.getByRole("button", { name: "Cancelar" }).click();

    // Tras cerrar el modal (con carrierTrucks ya cargado), el botón debe
    // seguir visible — antes del fix, acá desaparecía.
    await expect(applyButton).toBeVisible();
  });

  test('sigue oculto si el único camión tiene una postulación activa (no completada)', async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...TRIP_WITH_COMPLETED_TRUCK,
          applications: [{ ...TRIP_WITH_COMPLETED_TRUCK.applications[0], tripStatus: "IN_PROGRESS" }],
        }),
      ),
    );
    // El backend no filtra por postulaciones existentes en /trucks (solo por
    // estado del camión) — el filtrado real de "ocupado" lo hace el frontend
    // con `appliedTruckIds`, por eso el mock devuelve el mismo camión.
    await page.route("**/api/drivers*", (r) =>
      fulfill(r, apiOk([{ id: 3, name: "Juan Perez", dni: "30111222", carrierId: 10 }])),
    );
    await page.route("**/api/trucks*", (r) =>
      fulfill(
        r,
        apiOk([
          {
            id: 5,
            chassisPlate: "AB123CD",
            type: "TOLVA",
            carrierId: 10,
            cargoInsuranceStatus: "APPROVED",
          },
        ]),
      ),
    );

    await page.goto("/loads/1?type=trip");

    const applyButton = page.getByRole("button", { name: "Postularse a este viaje" });
    await expect(applyButton).toBeVisible();
    await applyButton.click();
    await expect(page.getByText(/Todos los camiones de tu flota ya están postulados/)).toBeVisible();
  });
});

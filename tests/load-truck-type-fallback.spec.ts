import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug real (captura de pantalla, 2026-10-07): en "Mis Camiones en este
 * Viaje", el TIPO del camión mostraba "N/D". Confirmado contra el backend
 * real: el `truck` embebido en `applications[]` (GET /trips/:id) solo trae
 * `{id, plate}` — sin `type`, `chassisPlate` ni `trailerPlate`. Se completa
 * pidiendo GET /trucks/:id puntualmente, solo para los que faltan.
 */
const TRIP_WITH_SKINNY_TRUCK = {
  id: 1,
  status: "ASSIGNED",
  origin: "Coop Urdinarrain",
  destination: "Rosario",
  maxTrucks: 1,
  applications: [
    {
      id: 200,
      status: "ACCEPTED",
      carrierId: 10,
      driverId: 1,
      truckId: 133,
      carrier: { id: 10, name: "Transporte Juan" },
      driver: { id: 1, name: "Juan Perez" },
      // Forma real del backend: solo id + plate, sin type.
      truck: { id: 133, plate: "ETE474" },
    },
  ],
};

const FULL_TRUCK = {
  id: 133,
  plate: "ETE474",
  chassisPlate: "ETE474",
  trailerPlate: "AB452YQ",
  type: "CHASIS_Y_ACOPLADO",
  capacity: 30000,
  carrierId: 10,
};

test.describe("Mis Camiones en este Viaje — completar el tipo de camión faltante", () => {
  test("cuando el truck embebido no trae type, lo pide a /trucks/:id y lo muestra", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) => fulfill(r, apiOk(TRIP_WITH_SKINNY_TRUCK)));
    let requestedTruckId: string | null = null;
    await page.route("**/api/trucks/133", (r) => {
      requestedTruckId = "133";
      return fulfill(r, apiOk(FULL_TRUCK));
    });

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("ETE474")).toBeVisible();
    await expect(page.getByText("N/D")).toHaveCount(0);
    await expect(page.getByText("CHASIS_Y_ACOPLADO")).toBeVisible();
    await expect.poll(() => requestedTruckId).toBe("133");
  });

  test("si el truck embebido YA trae type, no pide nada de más", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips/1", (r) =>
      fulfill(
        r,
        apiOk({
          ...TRIP_WITH_SKINNY_TRUCK,
          applications: [
            {
              ...TRIP_WITH_SKINNY_TRUCK.applications[0],
              truck: { id: 133, plate: "ETE474", type: "BATEA" },
            },
          ],
        }),
      ),
    );
    let truckDetailRequested = false;
    await page.route("**/api/trucks/133", (r) => {
      truckDetailRequested = true;
      return fulfill(r, apiOk(FULL_TRUCK));
    });

    await page.goto("/loads/1?type=trip");

    await expect(page.getByText("BATEA")).toBeVisible();
    await expect(truckDetailRequested).toBe(false);
  });
});

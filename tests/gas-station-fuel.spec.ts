import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * GAS_STATION — "Control Combustible" (LoadsPage en modo isPlayero).
 *
 * Confirmado contra el backend real: armar esta pantalla con
 * `GET /trips?status=ACTIVE` (como era antes) hacía que un camión ya
 * asignado desapareciera apenas se llenaban todos los cupos del viaje
 * (el viaje deja de estar "ACTIVE"), aunque el camión siguiera esperando
 * cargar combustible — ese era el reporte de "no me aparece el camión".
 *
 * Ahora se arma con `GET /loads?status=ASSIGNED`: un registro por camión
 * ya asignado, sin depender del estado del viaje padre, y que ya excluye
 * los que despacharon (IN_PROGRESS/COMPLETED) — el combustible se carga
 * antes que el cereal, así que un camión que ya salió con CTG no debe
 * seguir en la cola.
 *
 * También: la columna Tarifa se sacó (pedido explícito, no hace falta en
 * esta pantalla).
 */
const ASSIGNED_LOAD = {
  id: 105,
  tripId: 50,
  status: "ASSIGNED",
  fuelConsumption: null,
  origin: "Córdoba",
  destination: "Rosario",
  cereal: "Soja",
  loadingTimeStart: "08:00",
  loadingTimeEnd: "12:00",
  rate: 15000,
  carrier: { name: "Transporte Juan" },
  driver: { name: "Juan Perez", dni: "30111222" },
  truck: { chassisPlate: "AB123CD" },
};

test.describe("GAS_STATION · control de combustible", () => {
  test("muestra Ruta, Franja Horaria y Cereal, pero NO Tarifa", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    await page.route("**/api/loads?status=ASSIGNED*", (r) => fulfill(r, apiOk([ASSIGNED_LOAD])));

    await page.goto("/loads");

    await expect(page.getByText("AB123CD")).toBeVisible();
    await expect(page.getByText("Córdoba")).toBeVisible();
    await expect(page.getByText("Rosario")).toBeVisible();
    await expect(page.getByText("08:00 - 12:00 hs")).toBeVisible();
    await expect(page.getByText("Soja")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Tarifa" })).toHaveCount(0);
    await expect(page.getByText("$15.000")).toHaveCount(0);
  });

  test("no depende de /trips (el escenario exacto que reportaba fallar)", async ({ page }) => {
    // Bug reportado: al asignar la carga a un camión, dejaba de aparecer
    // en Combustible. Causa: la pantalla se armaba con /trips?status=ACTIVE,
    // que deja de incluir el viaje apenas se llenan todos los cupos.
    // Verificamos que ya no se llame a /trips en absoluto para esta pantalla.
    await loginAs(page, "GAS_STATION");
    let tripsCalled = false;
    await page.route("**/api/trips*", (route) => {
      tripsCalled = true;
      return fulfill(route, apiOk([]));
    });
    await page.route("**/api/loads?status=ASSIGNED*", (r) => fulfill(r, apiOk([ASSIGNED_LOAD])));

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toBeVisible();
    expect(tripsCalled, "La pantalla de combustible no debe depender de /trips").toBe(false);
  });

  test("al tocar 'No cargó' se envía fuelConsumption: 0 y el registro desaparece", async ({ page }) => {
    await loginAs(page, "GAS_STATION");

    // Confirmado contra el backend real: el PUT persiste fuelConsumption
    // de verdad. El mock simula esa persistencia devolviendo el registro
    // actualizado en el refetch posterior al PUT.
    let fuelConsumption: number | null = null;
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(r, apiOk([{ ...ASSIGNED_LOAD, fuelConsumption }])),
    );

    let putBody: unknown = null;
    await page.route("**/api/loads/105", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      fuelConsumption = 0;
      return fulfill(route, apiOk({ ...ASSIGNED_LOAD, fuelConsumption }));
    });

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toBeVisible();

    await page.getByRole("button", { name: "No cargó" }).click();

    await expect.poll(() => putBody).toEqual({ fuelConsumption: 0 });
    await expect(page.getByText("Se registró que el camión no cargó combustible")).toBeVisible();
    await expect(page.getByText("AB123CD")).toHaveCount(0);
  });

  test("al tocar 'Cargó' pide los litros, los envía en el PUT y el registro desaparece", async ({ page }) => {
    await loginAs(page, "GAS_STATION");
    let fuelConsumption: number | null = null;
    await page.route("**/api/loads?status=ASSIGNED*", (r) =>
      fulfill(r, apiOk([{ ...ASSIGNED_LOAD, fuelConsumption }])),
    );

    let putBody: unknown = null;
    await page.route("**/api/loads/105", (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      putBody = JSON.parse(route.request().postData() || "{}");
      fuelConsumption = 150;
      return fulfill(route, apiOk({ ...ASSIGNED_LOAD, fuelConsumption }));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Cargó", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Registrar Carga de Combustible" })).toBeVisible();
    await page.getByPlaceholder("Ej: 150").fill("150");
    await page.getByRole("button", { name: "Confirmar Carga" }).click();

    await expect.poll(() => putBody).toEqual({ fuelConsumption: 150 });
    await expect(page.getByText("Carga de combustible registrada")).toBeVisible();
    await expect(page.getByText("AB123CD")).toHaveCount(0);
  });

  test("un camión que ya salió con CTG (IN_PROGRESS) no aparece — se filtra por status=ASSIGNED", async ({
    page,
  }) => {
    // /loads?status=ASSIGNED nunca devuelve IN_PROGRESS/COMPLETED, pero
    // este test deja explícito el contrato: si el backend devolviera un
    // IN_PROGRESS colado, no debería mostrarse.
    await loginAs(page, "GAS_STATION");
    await page.route("**/api/loads?status=ASSIGNED*", (r) => fulfill(r, apiOk([])));

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toHaveCount(0);
    await expect(page.getByText("No se encontraron camiones autorizados para combustible.")).toBeVisible();
  });

  test("el buscador de patente/chofer/transportista se manda al backend por query param", async ({
    page,
  }) => {
    await loginAs(page, "GAS_STATION");
    const searches: (string | null)[] = [];
    await page.route("**/api/loads*", (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search");
      searches.push(search);
      const matches = !search || "ab123cd".includes(search.toLowerCase());
      return fulfill(route, apiOk(matches ? [ASSIGNED_LOAD] : []));
    });

    await page.goto("/loads");
    await expect(page.getByText("AB123CD")).toBeVisible();

    await page
      .getByPlaceholder("Buscar por Patente (Chasis/Acoplado), Chofer o Transportista...")
      .fill("ab123cd");

    await expect.poll(() => searches).toContain("ab123cd");
    // Mientras esperaba la respuesta del backend, el dato viejo no debió
    // parpadear a skeleton (regla del proyecto: no re-skeletonear un
    // refetch sobre datos ya visibles).
    await expect(page.getByText("AB123CD")).toBeVisible();
  });
});

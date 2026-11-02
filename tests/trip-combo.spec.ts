import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Combo de viajes (ida y vuelta, 2 tramos, tarifa plana). Backend:
 * POST /trips con `isCombo` + `leg2*`; cada sub-load trae `comboStage`
 * (LEG1_ASSIGNED → LEG1_IN_PROGRESS → LEG1_COMPLETED → LEG2_IN_PROGRESS →
 * COMPLETED) y se avanza con POST /loads/:id/combo/leg1-complete,
 * /combo/start-leg2 y /combo/complete (este último también balanza).
 */
test.use({ timezoneId: "America/Argentina/Buenos_Aires" });

const COMBO_TRIP = {
  id: 20,
  status: "IN_PROGRESS",
  isCombo: true,
  origin: "Cooperativa Urdinarrain",
  destination: "Rosario - Terminal 6",
  cereal: "Maíz",
  date: "2026-11-02T11:00:00.000Z",
  loadingDate: "2026-11-02T11:00:00.000Z",
  leg2Origin: "Rosario",
  leg2Destination: "Cooperativa Urdinarrain",
  leg2Cargo: "Fertilizante",
  leg2LoadingDate: "2026-11-03T15:00:00.000Z",
  leg2Notes: "Carga en planta Yara de 08:00 a 14:00",
  maxTrucks: 1,
  cuposPendientes: 0,
  rate: 1200000,
};

const APP = {
  id: 900,
  carrierId: 10,
  truckId: 5,
  driverId: 3,
  status: "ACCEPTED",
  driver: { id: 3, name: "Juan Perez" },
  truck: { id: 5, chassisPlate: "AB123CD" },
};

const subload = (extra: Record<string, unknown>) => ({
  id: 55,
  tripId: 20,
  carrierId: 10,
  truckId: 5,
  isCombo: true,
  ctg: "123456789",
  loadedWeight: 29800,
  ...extra,
});

test.describe("Combo ida y vuelta", () => {
  test("publicar un combo: pide el tramo 2 y lo manda con isCombo", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([{ id: 1, name: "General", isGeneral: true }])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk({ id: 1, name: "General", members: [] })));
    let posted: Record<string, unknown> | null = null;
    await page.route("**/api/trips*", (route) => {
      if (route.request().method() === "POST") {
        posted = JSON.parse(route.request().postData() || "{}");
        return fulfill(route, apiOk({ id: 20 }));
      }
      return fulfill(route, apiOk([]));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();

    await page.getByPlaceholder("Ej: Buenos Aires").fill("Cooperativa Urdinarrain");
    await page.getByPlaceholder("Ej: Rosario").first().fill("Rosario - Terminal 6");
    await page.locator('input[type="date"]').nth(0).fill("2026-11-02");
    await page.locator('input[type="date"]').nth(1).fill("2026-11-02");
    await page.locator('input[type="time"]').nth(0).fill("08:00");
    await page.locator('input[type="time"]').nth(1).fill("17:00");
    await page.getByPlaceholder("Ej: Soja, Maíz").fill("Maíz");
    await page.getByPlaceholder("Ej: 500000").fill("1200000");

    await page.getByText("Combo ida y vuelta (2 tramos)").click();
    const leg2 = page.getByTestId("combo-leg2-fields");
    await expect(leg2).toBeVisible();
    // Sin el tramo 2 no se puede publicar.
    await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeDisabled();

    await leg2.getByLabel("Origen de la vuelta").fill("Rosario");
    await leg2.getByLabel("Destino de la vuelta").fill("Cooperativa Urdinarrain");
    await leg2.getByLabel("Carga de la vuelta", { exact: true }).fill("Fertilizante");
    await leg2.getByLabel("Fecha de carga de la vuelta").fill("2026-11-03");
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect.poll(() => posted).not.toBeNull();
    const body = posted as unknown as Record<string, unknown>;
    expect(body.isCombo).toBe(true);
    expect(body.leg2Origin).toBe("Rosario");
    expect(body.leg2Destination).toBe("Cooperativa Urdinarrain");
    expect(body.leg2Cargo).toBe("Fertilizante");
    expect(new Date(body.leg2LoadingDate as string).toLocaleDateString("es-AR")).toBe("3/11/2026");
    expect(body.targetGroups).toEqual([{ groupId: 1, rate: 1200000 }]);
  });

  test("un viaje común no manda campos de combo", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await page.route("**/api/groups", (r) => fulfill(r, apiOk([{ id: 1, name: "General", isGeneral: true }])));
    await page.route("**/api/groups/1", (r) => fulfill(r, apiOk({ id: 1, name: "General", members: [] })));
    let posted: Record<string, unknown> | null = null;
    await page.route("**/api/trips*", (route) => {
      if (route.request().method() === "POST") {
        posted = JSON.parse(route.request().postData() || "{}");
        return fulfill(route, apiOk({ id: 21 }));
      }
      return fulfill(route, apiOk([]));
    });

    await page.goto("/loads");
    await page.getByRole("button", { name: "Publicar Carga" }).click();
    await page.getByPlaceholder("Ej: Buenos Aires").fill("Coop");
    await page.getByPlaceholder("Ej: Rosario").fill("Rosario");
    await page.locator('input[type="date"]').nth(0).fill("2026-11-02");
    await page.locator('input[type="date"]').nth(1).fill("2026-11-02");
    await page.locator('input[type="time"]').nth(0).fill("08:00");
    await page.locator('input[type="time"]').nth(1).fill("17:00");
    await page.getByPlaceholder("Ej: Soja, Maíz").fill("Soja");
    await page.getByPlaceholder("Ej: 500000").fill("50000");
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect.poll(() => posted).not.toBeNull();
    const body = posted as unknown as Record<string, unknown>;
    expect(body).not.toHaveProperty("isCombo");
    expect(body).not.toHaveProperty("leg2Origin");
  });

  test("listado de disponibles: badge de combo y ruta de la vuelta", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/trips?*", (r) =>
      fulfill(r, apiOk([{ ...COMBO_TRIP, status: "ACTIVE", cuposPendientes: 1, applications: [], loads: [] }])),
    );

    await page.goto("/loads");
    const row = page.getByRole("row").filter({ hasText: "Rosario - Terminal 6" });
    await expect(row.getByText("🔄 Combo ida y vuelta")).toBeVisible();
    await expect(row.getByText("(Fertilizante)")).toBeVisible();
  });

  test("transportista: descarga del tramo 1 y remito de la vuelta, sin 'Confirmar Llegada'", async ({ page }) => {
    await loginAs(page, "CARRIER", { carrierId: 10 });
    await page.route("**/api/drivers*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/trucks*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/trips?*", (r) => fulfill(r, apiOk([])));

    let stage: Record<string, unknown> = { status: "IN_PROGRESS", currentLeg: 1, comboStage: "LEG1_IN_PROGRESS" };
    await page.route("**/api/trips/20", (r) =>
      fulfill(r, apiOk({ ...COMBO_TRIP, applications: [APP], loads: [subload(stage)] })),
    );
    const posts: { url: string; body: Record<string, unknown> }[] = [];
    await page.route("**/api/loads/55/combo/*", (route) => {
      const url = route.request().url();
      posts.push({ url, body: JSON.parse(route.request().postData() || "{}") });
      if (url.endsWith("leg1-complete")) {
        stage = { status: "IN_PROGRESS", currentLeg: 1, comboStage: "LEG1_COMPLETED", unloadedWeight: 29650 };
      } else if (url.endsWith("start-leg2")) {
        stage = {
          status: "IN_PROGRESS",
          currentLeg: 2,
          comboStage: "LEG2_IN_PROGRESS",
          unloadedWeight: 29650,
          leg2Remito: "0001-00045231",
        };
      }
      return fulfill(route, apiOk({ id: 55 }));
    });

    await page.goto("/loads/20?type=trip");

    await expect(page.getByTestId("combo-route")).toContainText("Vuelta: Rosario → Cooperativa Urdinarrain (Fertilizante)");
    await expect(page.getByText("Carga en planta Yara de 08:00 a 14:00")).toBeVisible();
    const progress = page.getByTestId("combo-progress");
    await expect(progress).toContainText("En viaje hacia Rosario - Terminal 6");
    await expect(page.getByRole("button", { name: "Confirmar Llegada a Destino" })).toHaveCount(0);

    await progress.getByRole("button", { name: "Registrar descarga en destino" }).click();
    await page.getByLabel("Kilos descargados (obligatorio)").fill("29650");
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0].url).toMatch(/\/loads\/55\/combo\/leg1-complete$/);
    expect(posts[0].body).toEqual({ unloadedWeight: 29650 });

    // Con los kg del tramo 1 NO queda como completado: falta la vuelta.
    await expect(progress).toContainText("Descargado en destino · 29.650 kg");
    await expect(page.getByText("COMPLETADO", { exact: true })).toHaveCount(0);

    await progress.getByRole("button", { name: "Ingresar remito y salir a Cooperativa Urdinarrain" }).click();
    await expect(page.getByRole("button", { name: "Iniciar vuelta" })).toBeDisabled();
    await page.getByLabel("Número de remito (obligatorio)").fill("0001-00045231");
    await page.getByRole("button", { name: "Iniciar vuelta" }).click();

    await expect.poll(() => posts.length).toBe(2);
    expect(posts[1].url).toMatch(/\/loads\/55\/combo\/start-leg2$/);
    expect(posts[1].body).toEqual({ remito: "0001-00045231" });

    await expect(progress).toContainText("En viaje hacia Cooperativa Urdinarrain con Fertilizante");
    await expect(progress).toContainText("Remito: 0001-00045231");
  });

  test("balanza: cierra el combo con el pesaje de la vuelta", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([])));
    let stage: Record<string, unknown> = {
      status: "IN_PROGRESS",
      currentLeg: 2,
      comboStage: "LEG2_IN_PROGRESS",
      unloadedWeight: 29650,
      leg2Remito: "0001-00045231",
    };
    await page.route("**/api/loads/55", (r) =>
      fulfill(
        r,
        apiOk({
          ...subload(stage),
          ...COMBO_TRIP,
          id: 55,
          carrier: { name: "Transporte Juan" },
          driver: { name: "Juan Perez" },
          truck: { chassisPlate: "AB123CD" },
        }),
      ),
    );
    let posted: Record<string, unknown> | null = null;
    await page.route("**/api/loads/55/combo/complete", (route) => {
      posted = JSON.parse(route.request().postData() || "{}");
      stage = { ...stage, status: "COMPLETED", comboStage: "COMPLETED", leg2UnloadedWeight: 30150 };
      return fulfill(route, apiOk({ id: 55 }));
    });

    await page.goto("/loads/55?type=load");
    const progress = page.getByTestId("combo-progress");
    await progress.getByRole("button", { name: "Registrar llegada y descarga en balanza" }).click();
    await page.getByLabel("Kilos descargados en balanza (obligatorio)").fill("30150");
    await page.getByLabel("Kilómetros (opcional)").fill("650");
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect.poll(() => posted).toEqual({ unloadedWeight: 30150, mileage: 650 });
    await expect(progress).toContainText("Descargado en Cooperativa Urdinarrain · 30.150 kg");
    await expect(progress.getByRole("button")).toHaveCount(0);
  });

  test("balanza no ve los pasos del transportista (descarga ida / remito)", async ({ page }) => {
    await loginAs(page, "EMPLOYEE");
    await page.route("**/api/loads?status=*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/scale/loads/search*", (r) => fulfill(r, apiOk([])));
    await page.route("**/api/loads/55", (r) =>
      fulfill(
        r,
        apiOk({
          ...COMBO_TRIP,
          ...subload({ status: "IN_PROGRESS", currentLeg: 1, comboStage: "LEG1_COMPLETED", unloadedWeight: 29650 }),
          carrier: { name: "Transporte Juan" },
          truck: { chassisPlate: "AB123CD" },
        }),
      ),
    );

    await page.goto("/loads/55?type=load");
    const progress = page.getByTestId("combo-progress");
    await expect(progress).toContainText("Ingresar remito para iniciar la vuelta");
    await expect(progress.getByRole("button")).toHaveCount(0);
  });
});

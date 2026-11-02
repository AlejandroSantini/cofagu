import { test, expect } from "@playwright/test";
import { apiError, apiOk, fulfill, loginAs } from "./utils";

/**
 * Editar un viaje publicado sin borrarlo y volverlo a crear. Backend:
 * GET /trips/:id trae `createdById`/`createdBy`/`isCreator`/`canEdit`;
 * PUT /trips/:id acepta actualización parcial y responde 403 si no es el
 * creador, 400 si el cupo queda debajo de los asignados o si el viaje ya
 * finalizó, 404 si no existe.
 */
test.use({ timezoneId: "America/Argentina/Buenos_Aires" });

const TRIP = {
  id: 15,
  status: "ACTIVE",
  origin: "Rosario",
  destination: "Buenos Aires",
  date: "2026-10-30T15:00:00.000Z",
  loadingDate: "2026-10-31T15:00:00.000Z",
  quotaDate: "2026-11-01T15:00:00.000Z",
  loadingTimeStart: "07:30",
  loadingTimeEnd: "16:00",
  cereal: "Maíz",
  maxTrucks: 6,
  cuposPendientes: 6,
  notes: "Ingreso por acceso norte",
  createdById: 1,
  createdBy: { id: 1, name: "Admin Test" },
  isCreator: true,
  canEdit: true,
  targetGroups: [{ tripId: 15, groupId: 1, rate: "58000.00", group: { id: 1, name: "General", isGeneral: true } }],
  excludedCarriers: [{ tripId: 15, carrierId: 3 }],
  applications: [],
  loads: [],
};

async function mockTrip(
  page: import("@playwright/test").Page,
  trip: Record<string, unknown>,
  list: Record<string, unknown>[] = [],
) {
  let current = trip;
  const puts: Record<string, unknown>[] = [];
  let putResponse: { status: number; body: unknown } | null = null;
  await page.route("**/api/trips?*", (r) => fulfill(r, apiOk(list)));
  await page.route("**/api/trips/15", (route) => {
    if (route.request().method() === "PUT") {
      const body = JSON.parse(route.request().postData() || "{}");
      puts.push(body);
      if (putResponse) return fulfill(route, putResponse.body, putResponse.status);
      current = { ...current, ...body };
      return fulfill(route, apiOk(current));
    }
    return fulfill(route, apiOk(current));
  });
  await page.route("**/api/groups", (r) => fulfill(r, apiOk([{ id: 1, name: "General", isGeneral: true }])));
  await page.route("**/api/groups/1", (r) =>
    fulfill(
      r,
      apiOk({
        id: 1,
        name: "General",
        isGeneral: true,
        members: [
          { id: 3, name: "Transporte Excluido", member_type: "carrier" },
          { id: 4, name: "Transporte Incluido", member_type: "carrier" },
        ],
      }),
    ),
  );
  return {
    puts,
    failNextPut: (status: number, message: string) => {
      putResponse = { status, body: apiError(message) };
    },
  };
}

test.describe("Editar viaje (solo el creador)", () => {
  test("el creador edita: formulario precargado y PUT con los cambios, sin perder tarifas ni excluidos", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const { puts } = await mockTrip(page, TRIP);

    await page.goto("/loads/15?type=trip");
    await page.getByRole("button", { name: "Editar Viaje" }).click();

    await expect(page.getByRole("heading", { name: "Editar Viaje" })).toBeVisible();
    await expect(page.getByPlaceholder("Ej: Buenos Aires")).toHaveValue("Rosario");
    await expect(page.getByPlaceholder("Ej: Rosario")).toHaveValue("Buenos Aires");
    await expect(page.getByPlaceholder("Ej: Soja, Maíz")).toHaveValue("Maíz");
    await expect(page.getByPlaceholder("Ej: 500000")).toHaveValue("58000");
    // El transportista excluido al publicar sigue destildado.
    await expect(page.getByRole("checkbox", { name: "Transporte Excluido" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Transporte Incluido" })).toBeChecked();

    await page.getByPlaceholder("Ej: Rosario").fill("Buenos Aires - Puerto Madero");
    await page.getByPlaceholder("Ej: 1", { exact: true }).fill("8");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect.poll(() => puts.length).toBe(1);
    const body = puts[0] as Record<string, unknown>;
    expect(body.destination).toBe("Buenos Aires - Puerto Madero");
    expect(body.maxTrucks).toBe(8);
    expect(body.targetGroups).toEqual([{ groupId: 1, rate: 58000 }]);
    expect(body.excludedCarriers).toEqual([3]);
    expect(new Date(body.loadingDate as string).toLocaleDateString("es-AR")).toBe("31/10/2026");
    expect(body).not.toHaveProperty("isCombo");

    // Vuelve al detalle ya actualizado.
    await expect(page.getByText("Viaje actualizado con éxito")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rosario → Buenos Aires - Puerto Madero" })).toBeVisible();
  });

  test("quien no es el creador no ve el botón", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockTrip(page, { ...TRIP, createdById: 99, isCreator: false, canEdit: false });

    await page.goto("/loads/15?type=trip");
    await expect(page.getByRole("heading", { name: "Rosario → Buenos Aires" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar Viaje" })).toHaveCount(0);
  });

  test("un viaje completado no se puede editar", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await mockTrip(page, { ...TRIP, status: "COMPLETED" });

    await page.goto("/loads/15?type=trip");
    await expect(page.getByRole("heading", { name: "Rosario → Buenos Aires" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar Viaje" })).toHaveCount(0);
  });

  test("400 por cupo menor a los asignados: el error queda en el campo de camiones", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const { failNextPut } = await mockTrip(page, TRIP);
    failNextPut(400, "El cupo de camiones (1) no puede ser menor a los camiones ya asignados (2)");

    await page.goto("/loads/15?type=trip");
    await page.getByRole("button", { name: "Editar Viaje" }).click();
    await page.getByPlaceholder("Ej: 1", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText("El cupo de camiones (1) no puede ser menor a los camiones ya asignados (2)"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });

  test("403 (no es el creador): avisa y cierra el formulario", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const { failNextPut } = await mockTrip(page, TRIP);
    failNextPut(403, "Solo el creador del viaje puede editarlo");

    await page.goto("/loads/15?type=trip");
    await page.getByRole("button", { name: "Editar Viaje" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Solo el creador del viaje puede editarlo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar Viaje" })).toBeVisible();
  });

  test("desde la tabla: el lápiz aparece solo en los viajes propios y abre la edición precargada", async ({ page }) => {
    await loginAs(page, "ADMIN");
    const ajeno = { ...TRIP, id: 16, destination: "Santa Fe", createdById: 99, isCreator: false, canEdit: false };
    await mockTrip(page, TRIP, [TRIP, ajeno]);

    await page.goto("/loads");
    const own = page.getByRole("row").filter({ hasText: "Buenos Aires" });
    const other = page.getByRole("row").filter({ hasText: "Santa Fe" });
    await expect(other).toBeVisible();
    await expect(other.getByRole("button", { name: "Editar viaje" })).toHaveCount(0);

    await own.getByRole("button", { name: "Editar viaje" }).click();
    await expect(page).toHaveURL(/\/loads\/15\?type=trip/);
    await expect(page.getByRole("heading", { name: "Editar Viaje" })).toBeVisible();
    await expect(page.getByPlaceholder("Ej: Rosario")).toHaveValue("Buenos Aires");

    // "Volver al Viaje" deja en el detalle, no reabre la edición.
    await page.getByRole("button", { name: "Volver al Viaje" }).click();
    await expect(page.getByRole("button", { name: "Editar Viaje" })).toBeVisible();
  });
});

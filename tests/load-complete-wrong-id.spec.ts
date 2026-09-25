import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Bug real reportado 2026-09-24 (audio de Ulises): en un viaje con varios
 * camiones, se completó (kilos de descarga) un cupo y OTRA postulación —
 * de otro transportista/camión, sin relación — apareció como "RECHAZADA".
 *
 * Confirmado contra el backend real (solo lectura, sobre el viaje 181): la
 * postulación en cuestión ya estaba RECHAZADA ~28 minutos ANTES de que se
 * postearan los kilos de descarga a su cupo — o sea, cargar los kilos no
 * causó el rechazo. Lo que sí se encontró y es un bug de front real: en
 * `LoadDetails.tsx`, cuando `load` viene de GET /trips/:id (type=trip, la
 * navegación normal de toda la app) y no hay ninguna postulación con
 * status ACCEPTED, se arma una tarjeta "directAssignmentTrip" cuyo id
 * caía en `load.id` — el ID DEL VIAJE, no el de un cupo/postulación real.
 * Con ese id, "Cargar CTG" terminaba posteando a un cupo completamente
 * ajeno (mismo patrón que el bug de Reportar Contingencia, ya arreglado).
 *
 * Ahora, sin un id de postulación real, el botón directamente no se
 * muestra — no hay forma de que la UI dispare esa escritura con el id
 * equivocado.
 */
const TRIP_NO_ACCEPTED_APPS = {
  id: 900,
  status: "ASSIGNED",
  origin: "Campo A",
  destination: "Planta",
  maxTrucks: 1,
  cereal: "Soja",
  applications: [],
  loads: [],
};

test.describe("Cargar CTG / Completar viaje — no usar el id del viaje como id de postulación", () => {
  test("sin ninguna postulación ACCEPTED ni applicationId real, 'Cargar CTG' no se muestra", async ({ page }) => {
    await loginAs(page, "OPERATOR");
    await page.route("**/api/trips/900", (r) => fulfill(r, apiOk(TRIP_NO_ACCEPTED_APPS)));

    await page.goto("/loads/900?type=trip");

    await expect(page.getByRole("heading", { name: "Postulaciones y Viajes Asignados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cargar CTG (Carta de Porte)" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar CTG / Báscula" })).toHaveCount(0);
  });
});

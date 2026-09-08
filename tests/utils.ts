import type { Page, Route } from "@playwright/test";

/**
 * Helpers compartidos para los tests E2E.
 *
 * El backend real (Railway) nunca se toca: cada test intercepta las llamadas a
 * `**​/api/**` con `page.route(...)` y responde con datos fijos. La autenticación
 * se simula sembrando el `localStorage` que usa `useAuthStore` (persist de
 * zustand) antes de que arranque la app.
 */

export type Role =
  | "ADMIN"
  | "OPERATOR"
  | "EMPLOYEE"
  | "CARRIER"
  | "PLAYERO"
  | "GAS_STATION"
  | "LOGISTICS"
  | "TECHNICAL_CENTER"
  | "CONTROL_VIAJES";

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  carrierId?: number | null;
  mustChangePassword?: boolean;
}

export const MOCK_USERS: Record<Role, MockUser> = {
  ADMIN: { id: 1, name: "Admin Test", email: "admin@cofagu.com", role: "ADMIN" },
  OPERATOR: { id: 2, name: "Operador Test", email: "op@cofagu.com", role: "OPERATOR" },
  EMPLOYEE: { id: 3, name: "Balancero Test", email: "bal@cofagu.com", role: "EMPLOYEE" },
  CARRIER: { id: 4, name: "Transportista Test", email: "carrier@cofagu.com", role: "CARRIER", carrierId: 10 },
  PLAYERO: { id: 5, name: "Playero Test", email: "playa@cofagu.com", role: "PLAYERO" },
  GAS_STATION: { id: 6, name: "Playero Combustible", email: "gas@cofagu.com", role: "GAS_STATION" },
  LOGISTICS: { id: 7, name: "Logística Test", email: "log@cofagu.com", role: "LOGISTICS" },
  TECHNICAL_CENTER: { id: 8, name: "Centro Agrotécnico", email: "cat@cofagu.com", role: "TECHNICAL_CENTER" },
  CONTROL_VIAJES: { id: 9, name: "Control Viajes", email: "cv@cofagu.com", role: "CONTROL_VIAJES" },
};

/** Envuelve datos en el formato de respuesta del backend: `{ success, data }`. */
export const apiOk = <T>(data: T) => ({ success: true, data });

/** Cuerpo de error del backend. */
export const apiError = (message: string) => ({ success: false, message });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
};

/** Responde una ruta interceptada con JSON. */
export function fulfill(route: Route, json: unknown, status = 200) {
  return route.fulfill({ status, headers: CORS, json: json as object });
}

/** Atajo para `page.route` de un GET que devuelve `apiOk(data)`. */
export function mockGet(page: Page, pattern: string | RegExp, data: unknown) {
  return page.route(pattern, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return fulfill(route, apiOk(data));
  });
}

/**
 * Rutas que casi cualquier pantalla autenticada dispara al montar
 * (`AppLayout` hace polling del contador de notificaciones).
 */
export async function mockBaseline(page: Page) {
  await page.route("**/api/notifications/unread-count", (r) => fulfill(r, apiOk({ count: 0 })));
  await page.route("**/api/notifications", (r) => fulfill(r, apiOk([])));
}

/**
 * Deja la sesión iniciada como `role` sembrando el storage de zustand y
 * registra las rutas base. Después el test navega con `page.goto(...)`.
 */
export async function loginAs(
  page: Page,
  role: Role = "ADMIN",
  overrides: Partial<MockUser> = {},
) {
  const user: MockUser = { ...MOCK_USERS[role], ...overrides };
  await page.addInitScript((u) => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: u, token: "e2e-token" }, version: 0 }),
    );
  }, user);
  await mockBaseline(page);
  return user;
}

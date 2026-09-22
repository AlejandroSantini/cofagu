import { test, expect, type Page } from "@playwright/test";
import { fulfill, apiOk, loginAs } from "./utils";

/**
 * Notificaciones Push:
 * - NotificationsPage debe mostrar el estado real del permiso del navegador
 *   (bloqueado / necesita acceso directo en iPhone / listo para activar /
 *   ya activado), sin el panel de debug que quedó expuesto en producción.
 * - En mobile con el permiso todavía no pedido, un modal de onboarding
 *   (PushOnboardingModal, montado una sola vez en App.tsx) debe guiar al
 *   usuario a instalar la app / activar notificaciones, y no volver a
 *   aparecer una vez descartado (se recuerda en localStorage).
 * - En desktop el modal nunca debe aparecer.
 *
 * El fix del bug de push duplicados (public/firebase-messaging-sw.js) no se
 * puede cubrir acá: Playwright no simula eventos "push" reales contra un
 * service worker sin una infraestructura de push real de por medio.
 */

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";

async function forcePermission(page: Page, permission: "default" | "denied" | "granted") {
  // `usePushNotifications` puede volver a llamar a `Notification.requestPermission()`
  // aunque el permiso ya esté concedido (re-chequeo silencioso al montar) — si no se
  // mockea también esa función, el navegador real devuelve 'default' y pisa el estado.
  await page.addInitScript((p) => {
    Object.defineProperty(window.Notification, "permission", {
      get: () => p,
      configurable: true,
    });
    window.Notification.requestPermission = () => Promise.resolve(p);
  }, permission);
}

async function mockFcmRegister(page: Page) {
  await page.route("**/api/users/fcm-token", (r) => fulfill(r, apiOk(undefined)));
}

test.describe("NotificationsPage — estado del permiso push", () => {
  test("permiso 'denied' muestra las instrucciones para desbloquear manualmente", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await forcePermission(page, "denied");

    await page.goto("/notifications");

    await expect(page.getByText("Notificaciones bloqueadas por el navegador")).toBeVisible();
    await expect(page.getByText("🔧 Debug Push Notifications")).toHaveCount(0);
  });

  test("permiso 'default' en desktop muestra el botón de activar", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await forcePermission(page, "default");

    await page.goto("/notifications");

    await expect(page.getByText("Notificaciones Push inactivas en este dispositivo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activar Notificaciones" })).toBeVisible();
  });

  test("permiso 'granted' muestra la confirmación, sin botón ni panel de debug", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await forcePermission(page, "granted");
    await mockFcmRegister(page);

    await page.goto("/notifications");

    await expect(page.getByText("Notificaciones Push activadas en este dispositivo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activar Notificaciones" })).toHaveCount(0);
    await expect(page.getByText("🔧 Debug Push Notifications")).toHaveCount(0);
  });

  test.describe("iPhone en Safari (no instalado como acceso directo)", () => {
    test.use({ userAgent: IOS_UA });

    test("permiso 'default' muestra los pasos para agregar a inicio, sin botón de activar", async ({ page }) => {
      await loginAs(page, "ADMIN");
      await forcePermission(page, "default");

      await page.goto("/notifications");

      await expect(page.getByText("En iPhone, primero agregá COFAGU a tu pantalla de inicio")).toBeVisible();
      await expect(page.getByRole("button", { name: "Activar Notificaciones" })).toHaveCount(0);
    });
  });
});

test.describe("Modal de onboarding de push (mobile)", () => {
  test.describe("Android", () => {
    test.use({ userAgent: ANDROID_UA });

    test("aparece con permiso 'default' y se puede descartar sin volver a mostrarse", async ({ page }) => {
      await loginAs(page, "ADMIN");
      await forcePermission(page, "default");

      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Activá las notificaciones" })).toBeVisible();
      await page.getByRole("button", { name: "Ahora no" }).click();
      await expect(page.getByRole("heading", { name: "Activá las notificaciones" })).toHaveCount(0);

      // No debe reaparecer en una recarga (se descarta con localStorage).
      await page.reload();
      await expect(page.getByRole("heading", { name: "Activá las notificaciones" })).toHaveCount(0);
    });
  });

  test.describe("iPhone en Safari (no instalado)", () => {
    test.use({ userAgent: IOS_UA });

    test("muestra los pasos para instalar, sin botón de activar directo", async ({ page }) => {
      await loginAs(page, "ADMIN");
      await forcePermission(page, "default");

      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Agregá COFAGU a tu pantalla de inicio" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Activar Notificaciones" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Entendido" })).toBeVisible();
    });
  });

  test("no aparece en desktop", async ({ page }) => {
    await loginAs(page, "ADMIN");
    await forcePermission(page, "default");

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Activá las notificaciones" })).toHaveCount(0);
  });
});

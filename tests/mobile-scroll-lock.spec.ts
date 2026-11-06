import { test, expect } from "@playwright/test";
import { apiOk, fulfill, loginAs } from "./utils";

/**
 * Reporte real (2026-11-06, iPhone): en el detalle de un viaje, al
 * scrollear para abajo y después querer volver para arriba, el scroll se
 * trababa (quedaba el header fijo y no se movía nada) hasta tocar un botón.
 * Causa: con `h-screen` (100vh) en iOS el documento también era scrolleable
 * además de <main>, y el gesto quedaba atrapado por el scroll de afuera.
 * El layout ahora tiene un único scroll (<main>) que no encadena al documento.
 */
test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });

const LONG_TRIP = {
  id: 501,
  status: "ACTIVE",
  origin: "Coop Urdinarrain ( solo bateas )",
  destination: "Gilbert",
  cereal: "Maiz",
  rate: null,
  maxTrucks: 1,
  targetGroups: Array.from({ length: 12 }, (_, i) => ({
    groupId: i + 1,
    rate: 8000,
    group: { id: i + 1, name: `Grupo ${i + 1}` },
  })),
  applications: [],
};

test("mobile: el único scroll es el de <main> y se puede volver para arriba", async ({ page }) => {
  await loginAs(page, "ADMIN");
  await page.route("**/api/trips/501", (r) => fulfill(r, apiOk(LONG_TRIP)));
  await page.route("**/api/loads/501", (r) => fulfill(r, apiOk(LONG_TRIP)));

  await page.goto("/loads/501");
  await expect(page.getByText("Gilbert").first()).toBeVisible();

  // El documento no scrollea: no hay un segundo scroll que "agarre" el gesto.
  const docScroll = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollHeight - el.clientHeight;
  });
  expect(docScroll).toBeLessThanOrEqual(0);

  const main = page.locator("main");
  await expect(main).toHaveCSS("overscroll-behavior-y", "contain");

  // <main> scrollea para abajo y vuelve para arriba.
  const maxScroll = await main.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(maxScroll).toBeGreaterThan(0);
  await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await main.evaluate((el) => el.scrollTo(0, 0));
  await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBe(0);

  // El header mobile sigue visible arriba.
  await expect(page.locator("header").first()).toBeInViewport();
});

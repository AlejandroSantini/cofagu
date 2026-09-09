/**
 * Fixture compartida para los specs por rol.
 *
 * `pageAs(role)` devuelve una página ya autenticada como ese rol: hace login
 * real por API, siembra el token en `localStorage` (misma clave y forma que
 * usa `useAuthStore` / el interceptor de axios) y abre un contexto nuevo.
 */
import {
  test as base,
  expect,
  type Locator,
  type Page,
  type BrowserContext,
} from '@playwright/test';
import { ApiClient, login, seedTrip, type SeedStage, type SeededTrip } from './api';
import type { E2ERole } from './env';

interface Fixtures {
  pageAs: (role: E2ERole) => Promise<Page>;
  /**
   * Igual que `seedTrip`, pero registra el viaje para borrarlo al terminar el
   * test. Sin esto, el único camión seed queda ocupado y los tests siguientes
   * fallan con "no tiene ningún camión disponible".
   */
  seed: (stage: SeedStage, overrides?: Record<string, unknown>) => Promise<SeededTrip>;
}

export const test = base.extend<Fixtures>({
  // `provide` es el segundo argumento que Playwright pasa a la fixture (por
  // convención suele llamarse `use`; lo renombramos para no chocar con la
  // regla de hooks de ESLint).
  pageAs: async ({ browser }, provide) => {
    const contexts: BrowserContext[] = [];

    const factory = async (role: E2ERole): Promise<Page> => {
      const session = await login(role);
      const context = await browser.newContext();
      contexts.push(context);
      await context.addInitScript((s) => {
        window.localStorage.setItem(
          'auth-storage',
          JSON.stringify({ state: { user: s.user, token: s.token }, version: 0 }),
        );
      }, session);
      return context.newPage();
    };

    await provide(factory);

    for (const c of contexts) await c.close();
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright exige el patrón de fixtures aunque no use deps
  seed: async ({}, provide) => {
    const tripIds: number[] = [];

    await provide(async (stage, overrides) => {
      const trip = await seedTrip(stage, overrides);
      tripIds.push(trip.tripId);
      return trip;
    });

    if (tripIds.length > 0) {
      const admin = await ApiClient.as('ADMIN');
      for (const id of tripIds) {
        try {
          await admin.deleteTrip(id);
        } catch {
          /* best effort — el sweep de test:e2e:cleanup lo agarra */
        }
      }
      await admin.dispose();
    }
  },
});

export { expect };

/**
 * Los `<Input>` / `<Select>` del design system no asocian `<label>` con el
 * control por id, así que `getByLabel` no sirve. Buscamos el control que
 * cuelga como hermano del label.
 */
export function selectField(page: Page, labelText: string): Locator {
  return page
    .locator('label', { hasText: labelText })
    .locator('xpath=following-sibling::div//select');
}

export function textField(page: Page, labelText: string): Locator {
  return page
    .locator('label', { hasText: labelText })
    .locator('xpath=following-sibling::div//input');
}

/** Modal abierto actual (solo hay uno por vez). Scope para botones/inputs. */
export function openModal(page: Page, headingText: string): Locator {
  return page
    .locator('div.relative.w-full.max-w-md')
    .filter({ has: page.getByRole('heading', { name: headingText }) });
}

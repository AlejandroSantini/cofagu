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
import { login } from './api';
import type { E2ERole } from './env';

interface Fixtures {
  pageAs: (role: E2ERole) => Promise<Page>;
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

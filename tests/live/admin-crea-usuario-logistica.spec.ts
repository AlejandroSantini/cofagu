import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { ApiClient } from './api';

/**
 * Prueba a mano contra el backend real: crear un usuario de Logística
 * desde "Personal / Usuarios" y confirmar que aparece el modal de
 * credenciales (sin íconos, botón de copiar alineado). Borra el usuario
 * de prueba al final.
 */
const skip = missingConfig(['ADMIN']);
test.describe('ADMIN · crea usuario de Logística desde Personal/Usuarios', () => {
  test.skip(!!skip, skip || '');

  test('el modal de credenciales aparece limpio, sin íconos, y el botón queda en línea', async ({
    pageAs,
  }) => {
    const email = `e2e-logistica-${Date.now()}@cofagu.com`;
    const page = await pageAs('ADMIN');

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/users/register') && r.request().method() === 'POST',
    );

    await page.goto('/users');
    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();

    const textField = (label: string) =>
      page.locator('label', { hasText: label }).locator('xpath=following-sibling::div//input');
    const selectField = (label: string) =>
      page.locator('label', { hasText: label }).locator('xpath=following-sibling::div//select');

    await textField('Nombre Completo').fill('E2E Logística Prueba');
    await textField('Correo Electrónico').fill(email);
    await textField('Contraseña').fill('claveTemporal123');
    await selectField('Rol de Usuario').selectOption('LOGISTICS');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();

    const response = await responsePromise;
    const body = await response.json();
    const createdId: number = body.data.id;

    try {
      await expect(page.getByText('Usuario creado con éxito')).toBeVisible();
      const heading = page.getByRole('heading', { name: 'Credenciales de Acceso Creadas' });
      await expect(heading).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByText('claveTemporal123')).toBeVisible();

      // Sin ícono arriba: el Modal solo debe tener el título, no el
      // recuadro de ícono que agrega junto (hideIcon).
      const modalBox = page.locator('div.relative.w-full.max-w-md');
      await expect(modalBox.locator('svg.lucide-info, svg.lucide-triangle-alert')).toHaveCount(0);

      // Botón de copiar: ícono y texto en línea, no apilados.
      const copyBtn = page.getByRole('button', { name: 'Copiar al portapapeles' });
      const icon = copyBtn.locator('svg').first();
      const textSpan = copyBtn.getByText('Copiar al portapapeles');
      const [iconBox, textBox] = await Promise.all([icon.boundingBox(), textSpan.boundingBox()]);
      expect(iconBox).not.toBeNull();
      expect(textBox).not.toBeNull();
      // Misma fila: el centro vertical del ícono cae dentro de la altura del texto.
      const iconCenterY = iconBox!.y + iconBox!.height / 2;
      expect(iconCenterY).toBeGreaterThanOrEqual(textBox!.y - 2);
      expect(iconCenterY).toBeLessThanOrEqual(textBox!.y + textBox!.height + 2);
      // El ícono queda a la izquierda del texto, no arriba.
      expect(iconBox!.x).toBeLessThan(textBox!.x);
    } finally {
      const admin = await ApiClient.as('ADMIN');
      try {
        await admin.deleteUser(createdId);
      } finally {
        await admin.dispose();
      }
    }
  });
});

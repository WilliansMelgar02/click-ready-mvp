import { test, expect } from '@playwright/test';

test('el sitio responde y muestra la marca Click&Ready', async ({ page }) => {
  const respuesta = await page.goto('/');
  expect(respuesta.status()).toBe(200);
  await expect(page.locator('.marca')).toContainText('Click&Ready');
});

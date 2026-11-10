import { test, expect } from '@playwright/test';

const CLIENTE = { nombre: 'Camila Fuentes', email: 'camila.fuentes@correo.cl', clave: 'Retiro#2026' };

const buscador = (page) => page.getByRole('combobox', { name: 'Buscar productos' });

async function abrir(page, ruta = '/') {
  await page.goto(`/${ruta.startsWith('#') ? ruta : `#${ruta}`}`);
  await expect(page.locator('body')).toHaveAttribute('data-listo', 'true');
}

async function registrarYEntrar(page) {
  await abrir(page, '/registro');
  await page.getByLabel('Nombre y apellido').fill(CLIENTE.nombre);
  await page.getByLabel('Correo electrónico').fill(CLIENTE.email);
  await page.getByLabel('Contraseña').fill(CLIENTE.clave);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Ingresa a tu cuenta' })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill(CLIENTE.email);
  await page.getByLabel('Contraseña').fill(CLIENTE.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('Hola, Camila')).toBeVisible();
}

test.describe('PBI-01 · registro, inicio de sesión y recuperación', () => {
  test('un cliente se registra, ingresa y cierra sesión', async ({ page }) => {
    await registrarYEntrar(page);
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible();
  });

  test('el registro muestra lo que falta a una contraseña débil', async ({ page }) => {
    await abrir(page, '/registro');
    await page.getByLabel('Nombre y apellido').fill('Pedro Soto');
    await page.getByLabel('Correo electrónico').fill('pedro@correo.cl');
    await page.getByLabel('Contraseña').fill('abc');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('alert')).toContainText('no cumple la política');
    await expect(page.getByRole('alert')).toContainText('Falta un número');
  });

  test('recupera la contraseña con el enlace del buzón sandbox', async ({ page }) => {
    await registrarYEntrar(page);
    await page.getByRole('button', { name: 'Salir' }).click();
    await abrir(page, '/recuperar');
    await page.getByLabel('Correo electrónico').fill(CLIENTE.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText('Si el correo está registrado')).toBeVisible();
    await page.getByRole('link', { name: 'Abrir buzón sandbox' }).click();
    await expect(page.getByText('Restablece tu contraseña')).toBeVisible();
    await page.getByRole('link', { name: 'Restablecer contraseña' }).click();
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva#Clave26');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await page.getByLabel('Correo electrónico').fill(CLIENTE.email);
    await page.getByLabel('Contraseña').fill('Nueva#Clave26');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Hola, Camila')).toBeVisible();
  });
});

test.describe('PBI-02 · búsqueda con autocompletar y filtros', () => {
  test('autocompleta, busca y filtra por marca y precio', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#total-resultados')).toContainText('1500 productos');
    await buscador(page).fill('arr');
    const sugerencias = page.getByRole('listbox');
    await expect(sugerencias.getByRole('option').first()).toContainText('Arroz');
    await sugerencias.getByRole('option').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Resultados para');

    await buscador(page).fill('leche');
    await buscador(page).press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('leche');
    await expect(page.locator('.producto').first()).toBeVisible();

    await page.locator('label.casilla', { hasText: 'Cordillera' }).click();
    await expect(page).toHaveURL(/marcas=Cordillera/);
    const marcas = async () => [...new Set(await page.locator('.producto__marca').allTextContents())];
    await expect.poll(marcas).toEqual(['Cordillera']);

    await page.getByLabel('Hasta').fill('1500');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page).toHaveURL(/max=1500/);
    const precioMaximo = async () => Math.max(...(await page.locator('.producto__precio').allTextContents()).map((t) => Number(t.replace(/\D/g, ''))));
    await expect.poll(precioMaximo).toBeLessThanOrEqual(1500);
  });

  test('filtra por categoría y avisa cuando no hay resultados', async ({ page }) => {
    await abrir(page);
    await page.locator('.chip', { hasText: 'Mascotas' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mascotas');
    await buscador(page).fill('televisor');
    await buscador(page).press('Enter');
    await expect(page.getByText('No encontramos productos')).toBeVisible();
    await page.getByRole('button', { name: 'Ver todo el catálogo' }).click();
    await expect(page.locator('#total-resultados')).toContainText('1500 productos');
    await expect(buscador(page)).toHaveValue('');
  });
});

test.describe('PBI-03 · carrito', () => {
  test('agrega, edita y elimina con totales actualizados y persistencia en la sesión', async ({ page }) => {
    await registrarYEntrar(page);
    await abrir(page, '/?q=arroz%20largo&orden=precio-asc');
    const botones = page.locator('.producto button:not([disabled])');
    await botones.nth(0).click();
    await botones.nth(1).click();
    await expect(page.locator('#insignia-carrito')).toHaveText('2');

    await page.getByRole('link', { name: 'Ver carrito' }).click();
    await expect(page.locator('.linea')).toHaveCount(2);
    const total = async () => Number((await page.locator('#total-carrito').textContent()).replace(/\D/g, ''));
    const antes = await total();

    await page.locator('.linea').first().getByRole('button', { name: 'Agregar uno' }).click();
    await expect(page.locator('#insignia-carrito')).toHaveText('3');
    expect(await total()).toBeGreaterThan(antes);

    const neto = Number((await page.locator('#total-neto').textContent()).replace(/\D/g, ''));
    const iva = Number((await page.locator('#total-iva').textContent()).replace(/\D/g, ''));
    expect(neto + iva).toBe(await total());

    await page.reload();
    await expect(page.locator('.linea')).toHaveCount(2);

    await page.locator('.linea').last().getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.locator('.linea')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Continuar al pago' })).toBeDisabled();
  });
});

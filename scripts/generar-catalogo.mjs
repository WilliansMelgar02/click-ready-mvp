import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOTAL_SKUS = 1500;
const SEMILLA = 20260706;

const TIENDAS = [
  { id: 'T01', nombre: 'Andes Market Ñuñoa', comuna: 'Ñuñoa' },
  { id: 'T02', nombre: 'Andes Market Providencia', comuna: 'Providencia' },
  { id: 'T03', nombre: 'Andes Market Maipú', comuna: 'Maipú' },
];

const MARCAS = ['Cordillera', 'Valle Verde', 'Del Sur', 'Pacífico', 'Altiplano',
  'Austral', 'Maule', 'Lago Azul', 'Campo Nuevo', 'Andina', 'Norte Grande', 'Patagonia Fresca'];

const CATEGORIAS = {
  'Despensa': [
    ['Arroz largo fino', ['1 kg', '2 kg', '5 kg'], 1490], ['Fideos spaghetti', ['400 g', '1 kg'], 990],
    ['Fideos tallarines', ['400 g', '1 kg'], 990], ['Aceite maravilla', ['900 ml', '1 L', '5 L'], 2690],
    ['Aceite de oliva extra virgen', ['500 ml', '1 L'], 6990], ['Azúcar granulada', ['1 kg', '5 kg'], 1290],
    ['Harina sin polvos', ['1 kg', '5 kg'], 1190], ['Lentejas', ['500 g', '1 kg'], 1690],
    ['Porotos tórtola', ['500 g', '1 kg'], 1890], ['Atún en agua', ['160 g', '3 x 160 g'], 1590],
    ['Salsa de tomate', ['200 g', '500 g'], 590], ['Café instantáneo', ['50 g', '170 g'], 3490],
    ['Té negro', ['20 bolsitas', '100 bolsitas'], 1290], ['Mermelada de frutilla', ['250 g', '500 g'], 1490],
    ['Avena tradicional', ['500 g', '1 kg'], 1390],
  ],
  'Lácteos y huevos': [
    ['Leche entera', ['1 L', '6 x 1 L'], 1090], ['Leche descremada', ['1 L', '6 x 1 L'], 1090],
    ['Yogur natural', ['125 g', '1 kg'], 450], ['Queso gauda laminado', ['250 g', '500 g'], 3490],
    ['Mantequilla con sal', ['125 g', '250 g'], 1990], ['Huevos blancos', ['6 un', '12 un', '30 un'], 2190],
    ['Crema de leche', ['200 ml', '1 L'], 1290], ['Quesillo fresco', ['400 g'], 2390],
  ],
  'Bebidas': [
    ['Agua mineral sin gas', ['500 ml', '1,6 L', '6 x 1,6 L'], 690], ['Agua mineral con gas', ['500 ml', '1,6 L'], 690],
    ['Jugo de naranja', ['1 L', '1,5 L'], 1590], ['Bebida cola', ['500 ml', '1,5 L', '3 L'], 1190],
    ['Bebida sabor limón', ['500 ml', '1,5 L'], 1190], ['Néctar de durazno', ['1 L', '1,5 L'], 1290],
    ['Bebida isotónica', ['500 ml', '1 L'], 990],
  ],
  'Frutas y verduras': [
    ['Manzana roja', ['1 kg', 'bolsa 2 kg'], 1490], ['Plátano', ['1 kg'], 1290], ['Palta hass', ['1 kg', 'malla 4 un'], 4990],
    ['Tomate', ['1 kg'], 1690], ['Lechuga escarola', ['1 un'], 990], ['Papa', ['1 kg', 'malla 3 kg'], 1190],
    ['Cebolla', ['1 kg', 'malla 2 kg'], 990], ['Zanahoria', ['1 kg'], 890], ['Limón', ['1 kg', 'malla 1 kg'], 1790],
  ],
  'Carnes y pescados': [
    ['Pechuga de pollo', ['1 kg', 'bandeja 700 g'], 5990], ['Carne molida 10% grasa', ['500 g', '1 kg'], 4990],
    ['Lomo vetado', ['1 kg'], 13990], ['Trutro de pollo', ['1 kg'], 3490], ['Salmón fresco', ['1 kg', 'porción 250 g'], 14990],
    ['Longaniza', ['500 g', '1 kg'], 3990], ['Chuleta de cerdo', ['1 kg'], 5490],
  ],
  'Panadería': [
    ['Pan marraqueta', ['1 kg', '4 un'], 1990], ['Pan hallulla', ['1 kg', '4 un'], 1990],
    ['Pan de molde blanco', ['500 g', '750 g'], 1890], ['Pan de molde integral', ['500 g', '750 g'], 2190],
    ['Queque de vainilla', ['400 g'], 2490],
  ],
  'Limpieza': [
    ['Detergente líquido', ['1 L', '3 L', '5 L'], 4990], ['Lavalozas concentrado', ['500 ml', '1 L'], 1690],
    ['Cloro tradicional', ['1 L', '2 L'], 990], ['Limpiador multiuso', ['500 ml', '900 ml'], 1890],
    ['Papel higiénico doble hoja', ['4 rollos', '12 rollos', '24 rollos'], 2990], ['Toalla de papel', ['2 rollos', '6 rollos'], 1990],
    ['Bolsas de basura', ['10 un', '30 un'], 1490],
  ],
  'Cuidado personal': [
    ['Shampoo', ['400 ml', '750 ml'], 3290], ['Acondicionador', ['400 ml', '750 ml'], 3290],
    ['Jabón de glicerina', ['1 un', '3 un'], 890], ['Pasta dental', ['90 g', '2 x 90 g'], 1790],
    ['Desodorante en barra', ['50 g'], 2690], ['Crema corporal', ['200 ml', '400 ml'], 3590],
  ],
  'Congelados': [
    ['Papas prefritas', ['1 kg', '2,5 kg'], 2990], ['Arvejas congeladas', ['500 g', '1 kg'], 1890],
    ['Helado de vainilla', ['1 L', '2 L'], 3490], ['Empanadas de pino', ['4 un', '12 un'], 4990],
    ['Mix de berries', ['500 g', '1 kg'], 3990],
  ],
  'Mascotas': [
    ['Alimento perro adulto', ['3 kg', '15 kg'], 8990], ['Alimento gato adulto', ['1 kg', '3 kg'], 4990],
    ['Arena sanitaria', ['4 kg', '10 kg'], 3990], ['Snack dental perro', ['7 un'], 2490],
  ],
};

function crearAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const azar = crearAleatorio(SEMILLA);
const redondear100 = (n) => Math.round(n / 100) * 100;

function factorFormato(formato, indice) {
  return 1 + indice * 0.85 + (/x|un|rollos/.test(formato) ? 0.1 : 0);
}

const combinaciones = [];
for (const [categoria, bases] of Object.entries(CATEGORIAS)) {
  for (const [nombre, formatos, precioBase] of bases) {
    formatos.forEach((formato, iFormato) => {
      for (const marca of MARCAS) combinaciones.push({ categoria, nombre, formato, iFormato, precioBase, marca });
    });
  }
}
if (combinaciones.length < TOTAL_SKUS) {
  throw new Error(`Solo hay ${combinaciones.length} combinaciones; se necesitan ${TOTAL_SKUS}.`);
}

for (let i = combinaciones.length - 1; i > 0; i--) {
  const j = Math.floor(azar() * (i + 1));
  [combinaciones[i], combinaciones[j]] = [combinaciones[j], combinaciones[i]];
}

const productos = combinaciones.slice(0, TOTAL_SKUS)
  .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es')
    || a.marca.localeCompare(b.marca, 'es') || a.iFormato - b.iFormato)
  .map((c, i) => {
    const variacionMarca = 0.85 + azar() * 0.35;
    const precio = Math.max(390, redondear100(c.precioBase * factorFormato(c.formato, c.iFormato) * variacionMarca) - 10);
    const stock = {};
    for (const t of TIENDAS) {
      stock[t.id] = azar() < 0.06 ? 0 : Math.floor(azar() * 120) + 1;
    }
    return {
      sku: `AM-${String(i + 1).padStart(6, '0')}`,
      nombre: `${c.nombre} ${c.formato}`,
      marca: c.marca,
      categoria: c.categoria,
      precio,
      stock,
    };
  });

const salida = {
  contrato: 'erp-mock/v1',
  generado: '2026-07-06',
  tiendas: TIENDAS,
  productos,
};

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'data', 'catalogo.json');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(salida));
console.log(`Catálogo generado: ${productos.length} SKUs en ${TIENDAS.length} tiendas en app/data/catalogo.json`);

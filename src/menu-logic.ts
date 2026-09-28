// Lógica del menú digital, sin interfaz: el menú viaja comprimido en el enlace (lz-string),
// así no hace falta servidor; y qué chip NFC alcanza para ese enlace.
import LZ from 'lz-string';
const pack = LZ.compressToEncodedURIComponent, unpack = LZ.decompressFromEncodedURIComponent;

export type Item = [name: string, price: number, desc: string, flags: string];
export type MenuData = { n: string; c: string; w: string; s: [string, Item[]][] };

export const DEMO: MenuData = { n: 'El Cerro', c: '8f7cf0', w: '', s: [
 ['Entradas', [['Guacamole con totopos', 95, 'Aguacate, cebolla, cilantro y chile serrano.', 'vp'], ['Queso fundido con chorizo', 110, 'Con tortillas de harina recién hechas.', 'l'], ['Sopa de tortilla', 85, 'Caldo de jitomate, aguacate, crema y queso.', 'l']]],
 ['Tacos', [['Al pastor (4)', 89, 'Con piña, cebolla y cilantro.', 'p'], ['De bistec (4)', 95, 'En tortilla de maíz, con frijoles charros.', ''], ['De nopales (4)', 79, 'Nopal asado con queso fresco.', 'vl']]],
 ['Platos fuertes', [['Cabrito al pastor', 320, 'Estilo Monterrey, con guacamole y frijoles.', ''], ['Arrachera 300 g', 290, 'Con cebollitas asadas y papa al horno.', ''], ['Enchiladas verdes', 150, 'Rellenas de pollo, con crema y queso.', 'lp']]],
 ['Postres', [['Flan napolitano', 65, 'Casero, con caramelo.', 'l'], ['Churros con cajeta', 70, 'Cinco piezas.', 'gl']]],
 ['Bebidas', [['Agua fresca 1 L', 40, 'Jamaica, horchata o limón.', 'v'], ['Café de olla', 38, 'Con canela y piloncillo.', 'v'], ['Refresco', 35, 'De lata.', '']]],
] };
export const menuLink = (m: MenuData, mesa = '', origin = globalThis.location?.origin ?? '') => `${origin}/menu${mesa ? `?mesa=${encodeURIComponent(mesa)}` : ''}#${pack(JSON.stringify(m))}`;
export const readMenu = (hash: string): MenuData => { try { const raw = hash.replace(/^#/, ''); if (raw) { const m = JSON.parse(unpack(raw) ?? ''); if (m?.n && Array.isArray(m.s)) return m; } } catch { /* menú de ejemplo */ } return DEMO; };
export const money = (n: number) => `$${n.toLocaleString('es-MX')}`;
export const FLAGS: Record<string, [string, string]> = { v: ['Vegetariano', 'Vegetarian'], p: ['Picante', 'Spicy'], l: ['Lácteos', 'Dairy'], g: ['Gluten', 'Gluten'], n: ['Nueces', 'Nuts'] };
export { chipFor, linkBytes } from './chip.ts';

// Versión para chip: sin descripciones de platillos. Un menú que no cabe completo suele caber así en un NTAG216;
// el QR sigue llevando el menú completo.
export const stripDesc = (m: MenuData): MenuData => ({ ...m, s: m.s.map(([n, items]) => [n, items.map(([name, price, , flags]) => [name, price, '', flags] as Item)]) });

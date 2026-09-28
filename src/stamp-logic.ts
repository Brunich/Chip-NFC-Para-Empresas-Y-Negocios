// Lógica de la tarjeta de sellos, sin interfaz: qué dice el enlace del chip y cómo se suma un sello.
export type Biz = { name: string; goal: number; prize: string; color: string; review: string; wa: string; pin?: string };
export type Card = { stamps: number; last: string; rewards: number; visits: number };
export type VisitStatus = 'new' | 'today' | 'full';

// Colores de la tarjeta, apagados para que ninguno grite; los enlaces viejos con otro color siguen funcionando.
export const COLORS = ['8f7cf0', '6fb89c', 'c27a92', '7899c4', 'c4a66a', '5a5ea8'];
export const slug = (s: string) => s.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'negocio';
export const today = (d = new Date()) => d.toLocaleDateString('sv');
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'N';
export const emptyCard = (): Card => ({ stamps: 0, last: '', rewards: 0, visits: 0 });

// Los datos del negocio viajan en el enlace que se graba en el chip: nombre, meta, premio, color…
export function bizFrom(search: string): Biz {
 const q = new URLSearchParams(search);
 const goal = Math.min(12, Math.max(3, Number(q.get('m')) || 8));
 const c = (q.get('c') ?? '').replace(/[^0-9a-f]/gi, '');
 return { name: q.get('n')?.trim() || 'El Cerro', goal, prize: q.get('p')?.trim() || 'Postre de la casa', color: c.length === 6 ? c : COLORS[0], review: q.get('r') ?? '', pin: (q.get('k') ?? '').replace(/[^0-9a-f]/g, '') || undefined, wa: (q.get('w') ?? '').replace(/\D/g, '') };
}
export function bizLink(b: Biz, origin = globalThis.location?.origin ?? '') {
 const q = new URLSearchParams({ n: b.name, m: String(b.goal), p: b.prize, c: b.color });
 if (b.review) q.set('r', b.review);
 if (b.wa) q.set('w', b.wa);
 if (b.pin) q.set('k', b.pin);
 return `${origin}/sello?${q}`;
}

// PIN de canje: en el enlace sólo va una huella del PIN (SHA-256 con el nombre del negocio), no el PIN.
export async function pinHash(name: string, pin: string) {
 const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${slug(name)}:${pin}`)));
 return [...bytes.slice(0, 5)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Una visita: un sello por día; con la tarjeta llena ya no suma y toca canjear.
export function applyVisit(card: Card, goal: number, day: string): { card: Card; status: VisitStatus } {
 const c = { ...card };
 if (c.stamps >= goal) return { card: c, status: 'full' };
 if (c.last === day) return { card: c, status: 'today' };
 c.stamps += 1; c.last = day; c.visits += 1;
 return { card: c, status: c.stamps >= goal ? 'full' : 'new' };
}
export const redeem = (card: Card): Card => ({ ...card, stamps: 0, rewards: card.rewards + 1 });

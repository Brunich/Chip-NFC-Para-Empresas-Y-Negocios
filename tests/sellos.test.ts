import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVisit, bizFrom, bizLink, emptyCard, pinHash, redeem, slug } from '../src/stamp-logic.ts';
import { chipFor, DEMO, menuLink, readMenu, stripDesc, linkBytes } from '../src/menu-logic.ts';

test('el enlace del chip lleva y trae los datos del negocio', () => {
 const b = { name: 'Café Aurora', goal: 6, prize: 'Un latte', color: '5fcfa9', review: '', wa: '528112345678' };
 const link = bizLink(b, 'https://x.mx');
 assert.match(link, /^https:\/\/x\.mx\/sello\?/);
 const back = bizFrom(new URL(link).search);
 assert.equal(back.name, 'Café Aurora');
 assert.equal(back.goal, 6);
 assert.equal(back.wa, '528112345678');
});

test('la meta se queda entre 3 y 12 y el color raro cae al de fábrica', () => {
 assert.equal(bizFrom('?m=40').goal, 12);
 assert.equal(bizFrom('?m=1').goal, 3);
 assert.equal(bizFrom('?c=zzz').color, '8f7cf0');
});

test('un sello por día, y con la tarjeta llena toca canjear', () => {
 let r = applyVisit(emptyCard(), 3, '2026-09-01');
 assert.equal(r.status, 'new');
 assert.equal(applyVisit(r.card, 3, '2026-09-01').status, 'today');
 r = applyVisit(r.card, 3, '2026-09-02');
 r = applyVisit(r.card, 3, '2026-09-03');
 assert.equal(r.status, 'full');
 assert.equal(r.card.stamps, 3);
 assert.equal(applyVisit(r.card, 3, '2026-09-04').card.stamps, 3);
 const c = redeem(r.card);
 assert.deepEqual([c.stamps, c.rewards, c.visits], [0, 1, 3]);
});

test('el PIN no viaja: sólo una huella que depende del negocio', async () => {
 const a = await pinHash('Café Aurora', '1234');
 assert.match(a, /^[0-9a-f]{10}$/);
 assert.equal(a, await pinHash('cafe aurora', '1234'));
 assert.notEqual(a, await pinHash('Otro', '1234'));
 assert.equal(slug('Tacos Doña Lupe!'), 'tacos-dona-lupe');
});

test('el menú viaja comprimido en el enlace y cabe en un chip', () => {
 const link = menuLink(DEMO, '4', 'https://x.mx');
 const url = new URL(link);
 assert.equal(url.searchParams.get('mesa'), '4');
 assert.deepEqual(readMenu(url.hash), DEMO);
 assert.equal(readMenu('#basura').n, DEMO.n);
 assert.equal(chipFor(100), 'NTAG213');
 assert.equal(chipFor(800), 'NTAG216');
 assert.equal(chipFor(2000), null);
});

test('lo que de verdad cabe en cada chip con el dominio del portafolio', () => {
 const O = 'https://bruno-portfolio-azure.vercel.app';
 const basic = bizLink({ name: 'Café Aurora', goal: 8, prize: 'Un latte', color: 'a894f0', review: '', wa: '528112345678', pin: 'a1b2c3d4e5' }, O);
 assert.equal(chipFor(linkBytes(basic)), 'NTAG213');
 const withReview = bizLink({ name: 'Café Aurora', goal: 8, prize: 'Un latte', color: 'a894f0', review: 'https://g.page/r/CaBcDeFgHiJkEAE/review', wa: '528112345678', pin: 'a1b2c3d4e5' }, O);
 assert.equal(chipFor(linkBytes(withReview)), 'NTAG215');
 assert.equal(chipFor(linkBytes(menuLink(DEMO, '4', O))), null);
 assert.equal(chipFor(linkBytes(menuLink(stripDesc(DEMO), '4', O))), 'NTAG216');
 assert.equal(readMenu(new URL(menuLink(stripDesc(DEMO), '', O)).hash).s[0][1][0][2], '');
});

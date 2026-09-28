import { useEffect, useMemo, useState } from 'react';
import { DEMO, menuLink, readMenu, money, FLAGS, chipFor, stripDesc, linkBytes } from './menu-logic';
import type { Item, MenuData } from './menu-logic';
export { DEMO, menuLink } from './menu-logic';
import { Plus, Minus, WhatsappLogo, Trash, Leaf, Fire } from '@phosphor-icons/react';
import { Qr, COLORS } from './Stamp';
import './menu.css';

// Menú digital: el mismo chip NFC (o un QR en la mesa) abre la carta; el cliente arma su pedido
// y lo manda por WhatsApp al negocio. El menú viaja comprimido en el enlace: no hace falta servidor.
type Lang = 'es' | 'en';

export function MenuPage({ lang }: { lang: Lang }) {
 const es = lang === 'es', t = (a: string, b: string) => es ? a : b;
 const menu = useMemo(() => readMenu(location.hash), []);
 const mesa = new URLSearchParams(location.search).get('mesa') ?? '';
 const [cat, setCat] = useState(0);
 const [order, setOrder] = useState<Record<string, number>>({});
 const [open, setOpen] = useState(false);
 useEffect(() => { document.title = `${menu.n} · ${t('menú', 'menu')}`; }, [menu.n]); // eslint-disable-line react-hooks/exhaustive-deps
 const all = menu.s.flatMap(([, items]) => items);
 const count = Object.values(order).reduce((s, n) => s + n, 0);
 const total = Object.entries(order).reduce((s, [name, n]) => s + (all.find(i => i[0] === name)?.[1] ?? 0) * n, 0);
 const add = (name: string, d: number) => setOrder(o => { const n = Math.max(0, (o[name] ?? 0) + d); const next = { ...o, [name]: n }; if (!n) delete next[name]; return next; });
 const text = [`${t('Hola', 'Hi')} ${menu.n}, ${t('quiero pedir', 'I would like to order')}${mesa ? ` (${t('mesa', 'table')} ${mesa})` : ''}:`, ...Object.entries(order).map(([name, n]) => `• ${n} × ${name}`), `${t('Total', 'Total')}: ${money(total)}`].join('\n');

 return <main className="mn-page" aria-label={t('Menú', 'Menu')} style={{ ['--c' as string]: `#${menu.c}` }}>
  <header className="mn-head">
   <span className="mn-logo">{menu.n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>
   <div><h1>{menu.n}</h1><p>{mesa ? t(`Mesa ${mesa} · `, `Table ${mesa} · `) : ''}{t('Elige y manda tu pedido por WhatsApp', 'Pick and send your order via WhatsApp')}</p></div>
  </header>
  <nav className="mn-cats" aria-label={t('Secciones del menú', 'Menu sections')}>{menu.s.map(([name], i) => <button key={name} aria-pressed={cat === i} onClick={() => { setCat(i); document.getElementById(`mn-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{name}</button>)}</nav>
  {menu.s.map(([name, items], i) => <section key={name} id={`mn-${i}`} className="mn-sec">
   <h2>{name}</h2>
   {items.map(([item, price, desc, flags], j) => <article key={item} className="mn-item" style={{ ['--i' as string]: j }}>
    <div><h3>{item}</h3>{desc && <p>{desc}</p>}{flags && <ul className="mn-flags">{[...flags].map(f => FLAGS[f] && <li key={f} className={`f-${f}`}>{f === 'v' ? <Leaf size={12} weight="fill"/> : f === 'p' ? <Fire size={12} weight="fill"/> : null}{FLAGS[f][es ? 0 : 1]}</li>)}</ul>}</div>
    <div className="mn-buy"><b>{money(price)}</b>{order[item] ? <span className="mn-qty"><button aria-label={t('Quitar uno', 'Remove one')} onClick={() => add(item, -1)}><Minus size={14} weight="bold"/></button><em>{order[item]}</em><button aria-label={t('Agregar otro', 'Add another')} onClick={() => add(item, 1)}><Plus size={14} weight="bold"/></button></span> : <button className="mn-add" aria-label={`${t('Agregar', 'Add')} ${item}`} onClick={() => add(item, 1)}><Plus size={16} weight="bold"/></button>}</div>
   </article>)}
  </section>)}
  {count > 0 && <div className={`mn-cart${open ? ' open' : ''}`}>
   {open && <div className="mn-cart-list"><ul>{Object.entries(order).map(([name, n]) => <li key={name}><span>{n} × {name}</span><button aria-label={t('Quitar', 'Remove')} onClick={() => add(name, -n)}><Trash size={15}/></button></li>)}</ul></div>}
   <button className="mn-cart-sum" onClick={() => setOpen(o => !o)}>{t(`${count} en tu pedido`, `${count} in your order`)} · <b>{money(total)}</b></button>
   {menu.w ? <a className="mn-send" href={`https://wa.me/${menu.w}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><WhatsappLogo size={19} weight="fill"/>{t('Pedir', 'Order')}</a> : <span className="mn-send off">{t('Menú de ejemplo', 'Sample menu')}</span>}
  </div>}
  <footer className="st-foot"><a href="https://bruno-portfolio-azure.vercel.app/proyectos/club-nfc">{t('Hecho por Bruno Salas', 'Made by Bruno Salas')}</a></footer>
 </main>;
}

// Armador del menú para el negocio: secciones, platillos y precios; sale el enlace, el QR y qué chip alcanza.
export function MenuBuilder({ lang }: { lang: Lang }) {
 const es = lang === 'es', t = (a: string, b: string) => es ? a : b;
 const [m, setM] = useState<MenuData>(() => ({ ...DEMO, s: DEMO.s.slice(0, 3).map(([n, items]) => [n, items.map(i => [...i] as Item)]) }));
 const [mesa, setMesa] = useState('');
 const link = menuLink(m, mesa), bytes = linkBytes(link), chip = chipFor(bytes);
 const lite = menuLink(stripDesc(m), mesa), liteBytes = linkBytes(lite), liteChip = chip ? null : chipFor(liteBytes);
 const [copied, setCopied] = useState(false);
 const [liteCopied, setLiteCopied] = useState(false);
 const upd = (fn: (d: MenuData) => void) => setM(prev => { const d: MenuData = JSON.parse(JSON.stringify(prev)); fn(d); setCopied(false); setLiteCopied(false); return d; });
 return <div className="mb">
  <div className="mb-form">
   <div className="mb-two">
    <label>{t('Negocio', 'Business')}<input value={m.n} maxLength={28} onChange={e => upd(d => { d.n = e.target.value; })}/></label>
    <label>{t('WhatsApp para pedidos', 'WhatsApp for orders')}<input value={m.w} inputMode="tel" placeholder="52 81 1234 5678" onChange={e => upd(d => { d.w = e.target.value.replace(/\D/g, ''); })}/></label>
   </div>
   <label className="mb-mesa">{t('Mesa (opcional: un QR por mesa)', 'Table (optional: one QR per table)')}<input value={mesa} maxLength={6} placeholder="7" onChange={e => setMesa(e.target.value.replace(/[^\w-]/g, ''))}/></label>
   <fieldset className="mb-colors"><legend>{t('Color', 'Color')}</legend>{COLORS.map(c => <button type="button" key={c} aria-label={`#${c}`} aria-pressed={m.c === c} style={{ background: `#${c}` }} onClick={() => upd(d => { d.c = c; })}/>)}</fieldset>
   {m.s.map(([name, items], si) => <fieldset key={si} className="mb-sec">
    <div className="mb-sec-head"><input value={name} aria-label={t('Sección', 'Section')} onChange={e => upd(d => { d.s[si][0] = e.target.value; })}/><button type="button" onClick={() => upd(d => { d.s.splice(si, 1); })} aria-label={t('Quitar sección', 'Remove section')}><Trash size={16}/></button></div>
    {items.map((it, ii) => <div key={ii} className="mb-item">
     <input value={it[0]} aria-label={t('Platillo', 'Dish')} onChange={e => upd(d => { d.s[si][1][ii][0] = e.target.value; })}/>
     <input value={it[1]} type="number" min={0} aria-label={t('Precio', 'Price')} onChange={e => upd(d => { d.s[si][1][ii][1] = Math.max(0, +e.target.value || 0); })}/>
     <input value={it[2]} placeholder={t('Descripción (opcional)', 'Description (optional)')} aria-label={t('Descripción', 'Description')} onChange={e => upd(d => { d.s[si][1][ii][2] = e.target.value; })}/>
     <button type="button" onClick={() => upd(d => { d.s[si][1].splice(ii, 1); })} aria-label={t('Quitar platillo', 'Remove dish')}><Trash size={15}/></button>
    </div>)}
    <button type="button" className="mb-add" onClick={() => upd(d => { d.s[si][1].push(['', 0, '', '']); })}><Plus size={14}/>{t('Platillo', 'Dish')}</button>
   </fieldset>)}
   <button type="button" className="mb-add" onClick={() => upd(d => { d.s.push([t('Nueva sección', 'New section'), []]); })}><Plus size={14}/>{t('Sección', 'Section')}</button>
  </div>
  <aside className="mb-out">
   <div className="mb-phone"><iframe title={t('Vista del menú', 'Menu preview')} src={link.replace(location.origin, '')} key={link}/></div>
   <div className="st-linkbox"><input readOnly value={link} aria-label={t('Enlace del menú', 'Menu link')} onFocus={e => e.target.select()}/><button className="st-btn" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }}>{copied ? t('Copiado', 'Copied') : t('Copiar', 'Copy')}</button></div>
   <p className={`mb-chip${chip || liteChip ? '' : ' no'}`}>{chip ? t(`Cabe en un chip ${chip} (${bytes} bytes).`, `Fits an ${chip} chip (${bytes} bytes).`) : liteChip ? t(`Completo mide ${bytes} bytes y no cabe en un chip. Sin descripciones mide ${liteBytes}: cabe en un ${liteChip}. El QR lleva el menú completo.`, `The full menu is ${bytes} bytes, too big for a chip. Without descriptions it is ${liteBytes}: fits an ${liteChip}. The QR carries the full menu.`) : t(`Mide ${bytes} bytes: no cabe en un chip ni sin descripciones. Usa el QR o divide el menú.`, `${bytes} bytes: too big for a chip even without descriptions. Use the QR or split the menu.`)}</p>
   {liteChip && <div className="st-linkbox"><input readOnly value={lite} aria-label={t('Enlace para el chip, sin descripciones', 'Chip link, without descriptions')} onFocus={e => e.target.select()}/><button className="st-btn" onClick={async () => { try { await navigator.clipboard.writeText(lite); setLiteCopied(true); } catch { setLiteCopied(false); } }}>{liteCopied ? t('Copiado', 'Copied') : t('Copiar para chip', 'Copy for chip')}</button></div>}
   <div className="st-print"><Qr text={link} label={t('QR del menú', 'Menu QR')}/><p>{t('Imprímelo para la mesa: con el número de mesa, el pedido llega diciendo de dónde viene.', 'Print it for the table: with a table number, the order says where it comes from.')}</p></div>
  </aside>
 </div>;
}

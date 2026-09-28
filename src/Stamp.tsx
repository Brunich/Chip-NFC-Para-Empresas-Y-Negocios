import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import './stamp.css';

// Tarjeta de sellos real: un chip NFC (o un QR) abre /sello con los datos del negocio en el enlace.
// El sello se guarda en el celular del cliente: uno al día, y al llenar la tarjeta se canjea el premio.
import { COLORS, bizFrom, pinHash, slug, today, initials, emptyCard, applyVisit } from './stamp-logic';
import type { Biz, Card, VisitStatus } from './stamp-logic';
export { COLORS, bizFrom, bizLink, pinHash } from './stamp-logic';
export type { Biz } from './stamp-logic';
import { bizLink } from './stamp-logic';
type Lang = 'es' | 'en';

export function Qr({ text, label }: { text: string; label: string }) {
 const svg = useMemo(() => { const qr = qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }, [text]);
 return <div className="st-qr" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }}/>;
}

const read = (key: string): Card => { try { const c = JSON.parse(localStorage.getItem(key) ?? ''); if (typeof c.stamps === 'number') return c; } catch { /* tarjeta nueva */ } return emptyCard(); };
const write = (key: string, c: Card) => { try { localStorage.setItem(key, JSON.stringify(c)); } catch { /* sin almacenamiento: la tarjeta vive sólo en esta visita */ } };
// El sello se aplica una sola vez por carga de página (React en modo estricto monta dos veces).
const visits = new Map<string, { card: Card; status: VisitStatus }>();
function visit(key: string, goal: number) {
 if (!visits.has(key)) {
  const r = applyVisit(read(key), goal, today());
  if (r.status === 'new' || (r.status === 'full' && r.card.last === today() && r.card.visits > 0)) write(key, r.card);
  visits.set(key, r);
 }
 return visits.get(key)!;
}

export function CardFace({ biz, stamps, fresh, lang }: { biz: Biz; stamps: number; fresh?: number; lang: Lang }) {
 const es = lang === 'es';
 return <div className="st-card" style={{ ['--c' as string]: `#${biz.color}` }}>
  <div className="st-card-top"><span className="st-logo">{initials(biz.name)}</span><div><strong>{biz.name}</strong><small>{es ? 'Tarjeta de sellos' : 'Stamp card'}</small></div><b className="st-count">{stamps}<span>/{biz.goal}</span></b></div>
  <div className="st-stamps" role="img" aria-label={es ? `${stamps} de ${biz.goal} sellos` : `${stamps} of ${biz.goal} stamps`} style={{ ['--n' as string]: biz.goal > 8 ? 6 : Math.ceil(biz.goal / 2) }}>
   {Array.from({ length: biz.goal }, (_, i) => <span key={i} className={`${i < stamps ? 'on' : ''}${i === fresh ? ' fresh' : ''}`} style={{ ['--i' as string]: i }}>{i === biz.goal - 1 ? '★' : i < stamps ? '✓' : ''}</span>)}
  </div>
  <p className="st-prize">{es ? 'Premio' : 'Reward'}: <b>{biz.prize}</b></p>
 </div>;
}

export function StampPage({ lang }: { lang: Lang }) {
 const es = lang === 'es';
 const biz = useMemo(() => bizFrom(location.search), []);
 const key = `sello:${slug(biz.name)}`;
 const first = visit(key, biz.goal);
 const [card, setCard] = useState(first.card);
 const [status, setStatus] = useState(first.status);
 const [confirm, setConfirm] = useState(false);
 const [pin, setPin] = useState('');
 const [pinErr, setPinErr] = useState(false);
 const demo = new URLSearchParams(location.search).has('demo');
 useEffect(() => { document.title = `${biz.name} · ${es ? 'tus sellos' : 'your stamps'}`; }, [biz.name, es]);
 const left = biz.goal - card.stamps;

 async function redeem() {
  if (biz.pin && await pinHash(biz.name, pin) !== biz.pin) { setPinErr(true); return; }
  const c = { ...card, stamps: 0, rewards: card.rewards + 1 }; write(key, c); setCard(c); setStatus('today'); setConfirm(false); setPin(''); setPinErr(false);
 }
 function another() { // para probar: simula la visita de otro día
  if (card.stamps >= biz.goal) return;
  const c = { ...card, stamps: card.stamps + 1, visits: card.visits + 1, last: today() }; write(key, c); setCard(c); setStatus(c.stamps >= biz.goal ? 'full' : 'new');
 }

 return <main className="st-page" style={{ ['--c' as string]: `#${biz.color}` }}>
  <div className="st-glow" aria-hidden="true"/>
  <CardFace biz={biz} stamps={card.stamps} fresh={status !== 'today' ? card.stamps - 1 : undefined} lang={lang} key={card.stamps}/>
  <section className="st-msg" aria-live="polite">
   {status === 'new' && <><h1>{es ? '¡Sello de hoy listo!' : 'Today’s stamp is in!'}</h1><p>{es ? `Te ${left === 1 ? 'falta 1' : `faltan ${left}`} para: ${biz.prize}.` : `${left} more for: ${biz.prize}.`}</p></>}
   {status === 'today' && <><h1>{card.stamps ? (es ? 'Ya tienes el sello de hoy.' : 'You already have today’s stamp.') : (es ? 'Tarjeta canjeada.' : 'Card redeemed.')}</h1><p>{es ? 'Uno por día: vuelve pronto por el siguiente.' : 'One a day: come back soon for the next one.'}</p></>}
   {status === 'full' && !confirm && <><h1>{es ? '¡Tarjeta completa!' : 'Card complete!'}</h1><p>{es ? `Tu premio: ${biz.prize}. Enséñale esta pantalla a quien te atiende.` : `Your reward: ${biz.prize}. Show this screen to the staff.`}</p><button className="st-btn" onClick={() => setConfirm(true)}>{es ? 'Canjear premio' : 'Redeem reward'}</button></>}
   {status === 'full' && confirm && <><h1>{es ? '¿Ya te lo dieron?' : 'Did you get it?'}</h1><p>{biz.pin ? (es ? 'Quien te atiende escribe el PIN del negocio para canjearlo.' : 'The staff types the business PIN to redeem it.') : (es ? 'Que lo confirme alguien del negocio: la tarjeta vuelve a empezar.' : 'Let the staff confirm it: the card starts over.')}</p>{biz.pin && <input className="st-pin" value={pin} inputMode="numeric" maxLength={6} autoComplete="off" aria-label="PIN" placeholder="PIN" onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinErr(false); }}/>}{pinErr && <p className="st-err">{es ? 'PIN incorrecto.' : 'Wrong PIN.'}</p>}<div className="st-row"><button className="st-btn" onClick={() => void redeem()}>{es ? 'Sí, canjeado' : 'Yes, redeemed'}</button><button className="st-btn ghost" onClick={() => setConfirm(false)}>{es ? 'Todavía no' : 'Not yet'}</button></div></>}
  </section>
  {(biz.review || biz.wa) && <nav className="st-links">
   {biz.review && <a className="st-btn ghost" href={biz.review} target="_blank" rel="noreferrer">{es ? '¿Te gustó? Deja una reseña' : 'Liked it? Leave a review'}</a>}
   {biz.wa && <a className="st-btn ghost" href={`https://wa.me/${biz.wa}`} target="_blank" rel="noreferrer">{es ? `Escribirle a ${biz.name}` : `Message ${biz.name}`}</a>}
  </nav>}
  {demo && <button className="st-demo" onClick={another} disabled={card.stamps >= biz.goal}>{es ? 'Demo: simular la visita de otro día' : 'Demo: simulate another day’s visit'}</button>}
  <footer className="st-foot">{es ? `${card.visits} ${card.visits === 1 ? 'visita' : 'visitas'}${card.rewards ? ` · ${card.rewards} ${card.rewards === 1 ? 'premio' : 'premios'}` : ''} · tus sellos viven en este celular` : `${card.visits} visit${card.visits === 1 ? '' : 's'}${card.rewards ? ` · ${card.rewards} reward${card.rewards === 1 ? '' : 's'}` : ''} · your stamps live on this phone`}<a href="https://bruno-portfolio-azure.vercel.app/proyectos/club-nfc">{es ? 'Hecho por Bruno Salas' : 'Made by Bruno Salas'}</a></footer>
 </main>;
}

export function NfcSetup({ lang }: { lang: Lang }) {
 const es = lang === 'es';
 const [biz, setBiz] = useState<Biz>({ name: 'El Cerro', goal: 8, prize: es ? 'Postre de la casa' : 'House dessert', color: COLORS[0], review: '', wa: '' });
 const [copied, setCopied] = useState(false);
 const [nfc, setNfc] = useState<'idle' | 'wait' | 'ok' | 'error'>('idle');
 const [pin, setPin] = useState('');
 useEffect(() => { let alive = true; if (/^\d{4,6}$/.test(pin)) void pinHash(biz.name, pin).then(h => { if (alive) setBiz(b => b.pin === h ? b : { ...b, pin: h }); }); else setBiz(b => b.pin ? { ...b, pin: undefined } : b); return () => { alive = false; }; }, [pin, biz.name]);
 const link = bizLink(biz);
 const canWrite = typeof window !== 'undefined' && 'NDEFReader' in window;
 const set = (p: Partial<Biz>) => { setBiz(b => ({ ...b, ...p })); setCopied(false); setNfc('idle'); };

 async function writeChip() {
  try {
   setNfc('wait');
   const Reader = (window as unknown as { NDEFReader: new () => { write: (m: unknown) => Promise<void> } }).NDEFReader;
   await new Reader().write({ records: [{ recordType: 'url', data: link }] });
   setNfc('ok');
  } catch { setNfc('error'); }
 }
 async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }

 return <div className="st-setup">
  <form className="st-form" onSubmit={e => e.preventDefault()}>
   <label>{es ? 'Nombre del negocio' : 'Business name'}<input value={biz.name} maxLength={28} onChange={e => set({ name: e.target.value })}/></label>
   <div className="st-two">
    <label>{es ? 'Sellos para el premio' : 'Stamps for the reward'}<select value={biz.goal} onChange={e => set({ goal: Number(e.target.value) })}>{[5, 6, 8, 10].map(n => <option key={n}>{n}</option>)}</select></label>
    <label>{es ? 'Premio' : 'Reward'}<input value={biz.prize} maxLength={32} onChange={e => set({ prize: e.target.value })}/></label>
   </div>
   <fieldset><legend>{es ? 'Color' : 'Color'}</legend>{COLORS.map(c => <button type="button" key={c} aria-label={`#${c}`} aria-pressed={biz.color === c} style={{ background: `#${c}` }} onClick={() => set({ color: c })}/>)}</fieldset>
   <label>{es ? 'Enlace para reseñas (opcional)' : 'Review link (optional)'}<input value={biz.review} placeholder="https://g.page/r/…/review" onChange={e => set({ review: e.target.value.trim() })}/></label>
   <label>{es ? 'PIN para canjear el premio (opcional, 4 a 6 números)' : 'PIN to redeem the reward (optional, 4–6 digits)'}<input value={pin} inputMode="numeric" maxLength={6} autoComplete="off" placeholder="2468" onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setCopied(false); setNfc('idle'); }}/></label>
   <label>{es ? 'WhatsApp del negocio (opcional)' : 'Business WhatsApp (optional)'}<input value={biz.wa} inputMode="tel" placeholder="52 81 1234 5678" onChange={e => set({ wa: e.target.value })}/></label>
  </form>
  <div className="st-out">
   <CardFace biz={biz} stamps={Math.min(3, biz.goal)} lang={lang}/>
   <div className="st-linkbox"><input readOnly value={link} aria-label={es ? 'Enlace del chip' : 'Chip link'} onFocus={e => e.target.select()}/><button className="st-btn" onClick={copy}>{copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}</button></div>
   <div className="st-actions">
    {canWrite ? <button className="st-btn" onClick={writeChip} disabled={nfc === 'wait'}>{nfc === 'wait' ? (es ? 'Acerca el chip al celular…' : 'Hold the chip to the phone…') : (es ? 'Grabar en el chip' : 'Write to the chip')}</button>
     : <p className="st-hint">{es ? 'Para grabar desde aquí abre esta página en Chrome de Android. En iPhone usa la app gratuita NFC Tools: Escribir → Añadir registro → URL → pega el enlace.' : 'To write from here, open this page in Chrome on Android. On iPhone use the free NFC Tools app: Write → Add record → URL → paste the link.'}</p>}
    {nfc === 'ok' && <p className="st-ok">{es ? 'Listo: acerca un celular al chip para probarlo.' : 'Done: tap a phone on the chip to try it.'}</p>}
    {nfc === 'error' && <p className="st-err">{es ? 'No se pudo grabar. Revisa que el NFC esté prendido y vuelve a intentarlo.' : 'Could not write it. Check NFC is on and try again.'}</p>}
    <a className="st-btn ghost" href={`${link}&demo`} target="_blank" rel="noreferrer">{es ? 'Abrir como cliente' : 'Open as a customer'}</a>
   </div>
   <div className="st-print"><Qr text={link} label={es ? 'QR del enlace' : 'Link QR code'}/><p>{es ? 'El mismo enlace en QR, para los celulares sin NFC. Imprímelo junto al chip.' : 'The same link as a QR, for phones without NFC. Print it next to the chip.'}</p></div>
  </div>
 </div>;
}

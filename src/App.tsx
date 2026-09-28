import { useState } from 'react';
import Shell from './Shell';
import type { Lang } from './Shell';
import { info } from './info';
import { NfcSetup, StampPage } from './Stamp';
import { MenuBuilder, MenuPage } from './Menu';

// El chip abre /sello (la tarjeta del cliente) o /menu (la carta); la raíz es donde el negocio arma las suyas.
const path = location.pathname.replace(/\/$/, '');
const guess: Lang = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';

function Setup({ lang }: { lang: Lang }) {
 const es = lang === 'es';
 const [tool, setTool] = useState<'card' | 'menu'>(() => location.hash === '#menu' ? 'menu' : 'card');
 const steps = es
  ? [['Compra el chip', 'Stickers o tarjetas NFC NTAG215 (sirven los NTAG213 si no pones enlace de reseñas). Se venden en paquetes de 10.'], ['Arma tu tarjeta', 'Nombre, cuántos sellos y el premio. Abajo ves cómo le va a quedar al cliente.'], ['Grábalo y pégalo', 'Graba el enlace en el chip y pégalo en la carpeta de la cuenta o en la caja. iPhone y Android lo leen sin app.']]
  : [['Buy the chip', 'NTAG215 NFC stickers or cards (NTAG213 works if you skip the review link). Sold in packs of 10.'], ['Set up your card', 'Name, how many stamps and the reward. Below you see how the customer will see it.'], ['Write it and stick it', 'Write the link to the chip and stick it on the bill folder or the counter. iPhone and Android read it with no app.']];
 return <>
  <ol className="steps">{steps.map(([h, p], i) => <li key={h}><span>{String(i + 1).padStart(2, '0')}</span><strong>{h}</strong><p>{p}</p></li>)}</ol>
  <div className="tabs" role="tablist">{([['card', es ? 'Tarjeta de sellos' : 'Stamp card'], ['menu', es ? 'Menú' : 'Menu']] as const).map(([k, label]) => <button key={k} role="tab" aria-selected={tool === k} onClick={() => { setTool(k); history.replaceState(null, '', k === 'menu' ? '#menu' : location.pathname); }}>{label}</button>)}</div>
  {tool === 'card' ? <NfcSetup lang={lang}/> : <MenuBuilder lang={lang}/>}
 </>;
}

export default function App() {
 if (path === '/sello') return <StampPage lang={guess}/>;
 if (path === '/menu') return <MenuPage lang={guess}/>;
 return <Shell info={info} repo="nfc-negocios" page="club-nfc">{lang => <Setup lang={lang}/>}</Shell>;
}

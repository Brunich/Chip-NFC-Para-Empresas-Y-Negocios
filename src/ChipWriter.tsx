import { useEffect, useState } from 'react';
import { canUseNfc, cancelChip, failOf, isApp, readLink, writeLink } from './native';
import type { ChipFail } from './native';

type Lang = 'es' | 'en';

// Grabar el enlace en el chip y comprobarlo. Sirve igual para la tarjeta de sellos y para el menú.
export default function ChipWriter({ link, lang, disabled }: { link: string; lang: Lang; disabled?: boolean }) {
 const es = lang === 'es', t = (a: string, b: string) => es ? a : b;
 const [nfc, setNfc] = useState<'idle' | 'wait' | 'ok' | 'error'>('idle');
 const [check, setCheck] = useState<'idle' | 'wait' | 'same' | 'other' | 'error'>('idle');
 const [found, setFound] = useState('');
 const [fail, setFail] = useState<ChipFail>('other');
 useEffect(() => { setNfc('idle'); setCheck('idle'); }, [link]);
 useEffect(() => cancelChip, []);

 async function write() {
  setCheck('idle'); setNfc('wait');
  try { const r = await writeLink(link); setNfc('ok'); if (r.verified) { setFound(link); setCheck('same'); } }
  catch (e) { const f = failOf(e); if (f === 'cancelled') setNfc('idle'); else { setFail(f); setNfc('error'); } }
 }
 // Comprobar: lee el chip y compara su enlace con el que armaste.
 async function verify() {
  setCheck('wait');
  try { const url = await readLink(); setFound(url); setCheck(url === link ? 'same' : 'other'); }
  catch (e) { const f = failOf(e); if (f === 'cancelled') setCheck('idle'); else { setFail(f); setCheck('error'); } }
 }
 const stop = () => { cancelChip(); setNfc('idle'); setCheck('idle'); };
 const why = fail === 'nfc-off' ? t('El NFC está apagado: préndelo en Ajustes y vuelve a intentar.', 'NFC is off: turn it on in Settings and try again.')
  : fail === 'no-nfc' ? t('Este teléfono no tiene lector NFC.', 'This phone has no NFC reader.')
  : fail === 'too-small' ? t('El enlace no cabe en este chip: usa uno más grande (NTAG215 o 216).', 'The link does not fit this chip: use a bigger one (NTAG215 or 216).')
  : fail === 'read-only' ? t('Este chip está bloqueado y ya no se puede grabar.', 'This chip is locked and can no longer be written.')
  : fail === 'not-ndef' ? t('Este chip no sirve para enlaces. Busca chips NTAG213, 215 o 216.', 'This chip cannot hold links. Look for NTAG213, 215 or 216 chips.')
  : null;

 if (!canUseNfc()) return <p className="st-hint">{t('Para grabar desde aquí abre esta página en Chrome de Android o instala la app. En iPhone usa la app gratuita NFC Tools: Escribir → Añadir registro → URL → pega el enlace.', 'To write from here, open this page in Chrome on Android or install the app. On iPhone use the free NFC Tools app: Write → Add record → URL → paste the link.')}</p>;
 const waiting = nfc === 'wait' || check === 'wait';
 return <>
  <button className="st-btn" onClick={write} disabled={waiting || disabled}>{nfc === 'wait' ? t('Acerca el chip al celular…', 'Hold the chip to the phone…') : t('Grabar en el chip', 'Write to the chip')}</button>
  <button className="st-btn ghost" onClick={verify} disabled={waiting}>{check === 'wait' ? t('Acerca el chip para leerlo…', 'Hold the chip to read it…') : t('¿Quedó bien grabado?', 'Was it written right?')}</button>
  {waiting && isApp && <button className="st-btn ghost" onClick={stop}>{t('Cancelar', 'Cancel')}</button>}
  {check === 'same' && <p className="st-ok">{t('El chip tiene exactamente este enlace.', 'The chip holds exactly this link.')}</p>}
  {check === 'other' && <p className="st-err">{found ? t(`El chip tiene otro enlace: ${found.slice(0, 60)}… Vuelve a grabarlo.`, `The chip holds a different link: ${found.slice(0, 60)}… Write it again.`) : t('El chip está vacío. Grábalo primero.', 'The chip is empty. Write it first.')}</p>}
  {check === 'error' && <p className="st-err">{why ?? t('No se pudo leer. Prende el NFC y acerca el chip a la parte de atrás del celular.', 'Could not read it. Turn NFC on and hold the chip to the back of the phone.')}</p>}
  {nfc === 'ok' && <p className="st-ok">{t('Listo: acerca un celular al chip para probarlo.', 'Done: tap a phone on the chip to try it.')}</p>}
  {nfc === 'error' && <p className="st-err">{why ?? t('No se pudo grabar. Revisa que el NFC esté prendido y vuelve a intentarlo.', 'Could not write it. Check NFC is on and try again.')}</p>}
 </>;
}

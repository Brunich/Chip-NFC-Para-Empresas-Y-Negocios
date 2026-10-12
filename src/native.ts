import { Capacitor, registerPlugin } from '@capacitor/core';

// La app de Android usa su propio lector NFC (NfcChipPlugin.java); en el navegador, Web NFC de Chrome.
type NativeChip = {
 status(): Promise<{ supported: boolean; enabled: boolean }>;
 read(): Promise<{ url: string; size?: number; writable?: boolean }>;
 write(o: { url: string }): Promise<{ verified: boolean; bytes: number; size?: number }>;
 cancel(): Promise<void>;
 launchUrl(): Promise<{ url?: string | null }>;
 addListener(event: 'chip', fn: (r: { url: string }) => void): Promise<{ remove: () => Promise<void> }>;
};
type WebReader = { write: (m: unknown) => Promise<void>; scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: { message: { records: { recordType: string; data?: DataView }[] } }) => void) | null };

export const isApp = Capacitor.isNativePlatform();
const chip = registerPlugin<NativeChip>('NfcChip');
export const PUBLIC = 'https://bruno-portfolio-azure.vercel.app';

// En la app el origen es https://localhost: el chip tiene que llevar la página publicada para abrir en cualquier celular.
export const linkOrigin = () => isApp ? PUBLIC : globalThis.location?.origin ?? PUBLIC;
// Un enlace del chip, abierto dentro de la app en vez del navegador.
export const inApp = (url: string) => isApp && url.startsWith(PUBLIC) ? url.slice(PUBLIC.length) : url;

export const canUseNfc = () => isApp || (typeof window !== 'undefined' && 'NDEFReader' in window);
const Reader = () => new (window as unknown as { NDEFReader: new () => WebReader }).NDEFReader();

// Los errores del lector nativo traen un código; los de Web NFC no.
export type ChipFail = 'nfc-off' | 'no-nfc' | 'too-small' | 'read-only' | 'not-ndef' | 'cancelled' | 'other';
export const failOf = (e: unknown): ChipFail => {
 const code = (e as { code?: string })?.code;
 return code === 'nfc-off' || code === 'no-nfc' || code === 'too-small' || code === 'read-only' || code === 'not-ndef' || code === 'cancelled' ? code : 'other';
};

// Graba el enlace. En la app se relee al terminar y dice si quedó igual.
export async function writeLink(url: string): Promise<{ verified: boolean }> {
 if (isApp) return chip.write({ url });
 await Reader().write({ records: [{ recordType: 'url', data: url }] });
 return { verified: false };
}

export async function readLink(): Promise<string> {
 if (isApp) return (await chip.read()).url;
 const reader = Reader(), stop = new AbortController();
 return new Promise((done, fail) => {
  reader.onreading = e => {
   const rec = e.message.records.find(x => x.recordType === 'url');
   stop.abort(); done(rec?.data ? new TextDecoder().decode(rec.data) : '');
  };
  reader.scan({ signal: stop.signal }).catch(fail);
 });
}

export const cancelChip = () => { if (isApp) void chip.cancel().catch(() => undefined); };

// Si la app se abrió (o recibió) un chip del negocio, va directo a su tarjeta o su menú.
export function followChips() {
 if (!isApp) return;
 const go = (url?: string | null) => { if (url && /^\/(sello|menu)\b/.test(inApp(url))) location.href = inApp(url); };
 void chip.launchUrl().then(r => go(r.url)).catch(() => undefined);
 void chip.addListener('chip', r => go(r.url));
}

// Chips NFC: cuánto cabe en cada uno. El enlace se graba sin «https://» (NDEF lo abrevia en un byte).
export const chipFor = (bytes: number) => bytes <= 132 ? 'NTAG213' : bytes <= 492 ? 'NTAG215' : bytes <= 868 ? 'NTAG216' : null;
export const linkBytes = (url: string) => new TextEncoder().encode(url.replace(/^https:\/\//, '')).length;
// Una copia local graba 127.0.0.1 o localhost: el chip no abriría nada en el celular del cliente.
export const isLocalLink = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);

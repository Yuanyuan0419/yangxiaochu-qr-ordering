declare const __LAN_HOST__: string | null;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Origin encoded into table QR codes. A phone can't open "localhost", so when the owner is
 * using the dev server on the computer itself we substitute the computer's LAN address.
 */
export function publicOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  const { protocol, hostname, port, origin } = window.location;
  if (LOCAL_HOSTS.has(hostname) && __LAN_HOST__) return `${protocol}//${__LAN_HOST__}${port ? `:${port}` : ""}`;
  return origin;
}

export const isLocalOnlyOrigin = () => LOCAL_HOSTS.has(new URL(publicOrigin()).hostname);

export const menuPath = (slug: string, qrToken: string) => `/menu/${slug}/${qrToken}`;
export const menuUrl = (slug: string, qrToken: string) => `${publicOrigin()}${menuPath(slug, qrToken)}`;

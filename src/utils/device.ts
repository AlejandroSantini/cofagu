/** Detección de dispositivo/navegador para el onboarding de notificaciones push. */

export function isIOSDevice(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIOSDevice() || isAndroidDevice();
}

/** true si la app ya corre instalada (PWA en standalone), no en una pestaña del navegador. */
export function isStandaloneDisplay(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

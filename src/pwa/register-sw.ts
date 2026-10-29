/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners: Array<(event: BeforeInstallPromptEvent | null) => void> = [];

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function subscribeInstallPrompt(callback: (event: BeforeInstallPromptEvent | null) => void): () => void {
  installListeners.push(callback);
  callback(deferredPrompt);
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((cb) => cb(null));
    return choice.outcome === 'accepted';
  } catch (err) {
    console.error('PWA install prompt error:', err);
    return false;
  }
}

/**
 * Daftarkan service worker saat browser mendukungnya
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  // Tangkap prompt instalasi PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((cb) => cb(deferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((cb) => cb(null));
    console.log('AI Account Manager PWA berhasil diinstal ke layar utama.');
  });

  if ('serviceWorker' in navigator) {
    const register = () => {
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('Service Worker terdaftar dengan scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Registrasi Service Worker gagal:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }
}


import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { WALLET_STORAGE } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function readStoredWalletAddress(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  let stored: string | null = null;

  try {
    stored =
      window.localStorage.getItem(WALLET_STORAGE.localKey) ??
      window.sessionStorage.getItem(WALLET_STORAGE.sessionKey) ??
      null;
  } catch (err) {
    console.warn('Unable to read stored wallet from storage', err);
  }

  if (stored) {
    return stored;
  }

  if ('caches' in window) {
    try {
      const cache = await caches.open(WALLET_STORAGE.cacheName);
      const match = await cache.match(WALLET_STORAGE.cacheUrl);
      if (match) {
        const data = await match.json().catch(() => null);
        if (data && typeof data.address === 'string') {
          return data.address;
        }
      }
    } catch (err) {
      console.warn('Unable to read stored wallet from cache', err);
    }
  }

  return null;
}

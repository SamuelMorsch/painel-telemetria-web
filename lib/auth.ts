import { useMemo, useSyncExternalStore } from 'react';
import type { User } from './types';

// O token fica no sessionStorage: some ao fechar a aba. Compromisso documentado no ADR 0001.
const TOKEN_KEY = 'telemetria.token';
const USER_KEY = 'telemetria.user';
const AUTH_EVENT = 'telemetria:auth';
const SSR_SNAPSHOT = '\u0000ssr';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function saveSession(token: string, user: User): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function parseUser(raw: string): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

const readSnapshot = () => window.sessionStorage.getItem(USER_KEY) ?? '';
const readServerSnapshot = () => SSR_SNAPSHOT;

/** Usuário logado. `loading` é true só na primeira renderização (antes de ler o navegador). */
export function useStoredUser(): { loading: boolean; user: User | null } {
  const raw = useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);
  return useMemo(
    () => (raw === SSR_SNAPSHOT ? { loading: true, user: null } : { loading: false, user: parseUser(raw) }),
    [raw],
  );
}

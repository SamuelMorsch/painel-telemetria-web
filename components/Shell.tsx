'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { clearSession, useStoredUser } from '../lib/auth';
import { btnGhost } from './ui';

const roleLabel = { admin: 'Administrador', mechanic: 'Mecânico', driver: 'Motorista' } as const;

/** Moldura das páginas protegidas: cabeçalho + redireciona para o login se não houver sessão. */
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, user } = useStoredUser();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <>
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold">
            Telemetria Automotiva
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-neutral-500 sm:inline">
              {user.email} · {roleLabel[user.role]}
            </span>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                clearSession();
                router.replace('/login');
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { btn, card, input } from '../../components/ui';
import { apiFetch, describeError } from '../../lib/api';
import { saveSession } from '../../lib/auth';
import type { User } from '../../lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [workshopName, setWorkshopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login' ? { email, password } : { workshop_name: workshopName, email, password };
      const result = await apiFetch<{ token: string; user: User }>(path, { method: 'POST', body });
      saveSession(result.token, result.user);
      router.push('/');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={handleSubmit} className={`${card} w-full max-w-sm space-y-4`}>
        <div>
          <h1 className="text-xl font-semibold">Telemetria Automotiva</h1>
          <p className="text-sm text-neutral-500">
            {mode === 'login' ? 'Entre com a conta da sua oficina.' : 'Cadastre a sua oficina.'}
          </p>
        </div>

        {mode === 'register' && (
          <div className="space-y-1">
            <label htmlFor="workshop" className="text-sm font-medium">
              Nome da oficina
            </label>
            <input
              id="workshop"
              className={input}
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              required
              minLength={2}
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : 1}
          />
          {mode === 'register' && <p className="text-xs text-neutral-500">Mínimo de 8 caracteres.</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button type="submit" className={`${btn} w-full`} disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Cadastrar oficina'}
        </button>

        <button
          type="button"
          className="w-full text-center text-sm text-blue-600 hover:underline"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Cadastrar uma oficina' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  );
}

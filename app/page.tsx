'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Shell } from '../components/Shell';
import { Badge, Stat, btn, card, input } from '../components/ui';
import { apiFetch, describeError } from '../lib/api';
import { useStoredUser } from '../lib/auth';
import { formatDateTime, formatDuration, sessionState, type SessionState } from '../lib/series';
import type { Session, StoredAnomaly, Vehicle } from '../lib/types';

interface Overview {
  vehicles: Vehicle[];
  sessions: Session[];
  anomalies: StoredAnomaly[];
  /** Instante em que os dados foram buscados: base para decidir quem está "ao vivo". */
  fetchedAt: number;
}

export default function Home() {
  return (
    <Shell>
      <Overview />
    </Shell>
  );
}

function Overview() {
  const { user } = useStoredUser();
  const canRegisterVehicles = user?.role === 'admin' || user?.role === 'mechanic';

  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Atualiza a cada 10 s (e quando um veículo é cadastrado)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [vehicles, sessions, anomalies] = await Promise.all([
          apiFetch<Vehicle[]>('/api/vehicles'),
          apiFetch<Session[]>('/api/sessions?limit=20'),
          apiFetch<StoredAnomaly[]>('/api/anomalies?limit=10'),
        ]);
        if (!cancelled) {
          setData({ vehicles, sessions, anomalies, fetchedAt: Date.now() });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      }
    };
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reload]);

  const plates = useMemo(() => new Map((data?.vehicles ?? []).map((v) => [v.id, v.plate])), [data]);
  const now = data?.fetchedAt ?? 0;
  const liveCount = data ? data.sessions.filter((s) => sessionState(s, now) === 'live').length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Veículos" value={String(data?.vehicles.length ?? '—')} />
        <Stat label="Sessões ao vivo" value={String(data ? liveCount : '—')} />
        <Stat label="Quedas de tensão recentes" value={String(data?.anomalies.length ?? '—')} />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <section className={card}>
        <h2 className="mb-3 font-medium">Sessões recentes</h2>
        {data && data.sessions.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma sessão ainda. Conecte o app a um veículo ou rode o simulador.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">Veículo</th>
                  <th className="py-2 pr-4">Início</th>
                  <th className="py-2 pr-4">Duração</th>
                  <th className="py-2 pr-4">Situação</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data?.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-2 pr-4 font-medium">{plates.get(s.vehicle_id) ?? '—'}</td>
                    <td className="py-2 pr-4">{formatDateTime(s.started_at)}</td>
                    <td className="py-2 pr-4">
                      {s.ended_at ? formatDuration(Date.parse(s.ended_at) - Date.parse(s.started_at)) : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <SessionBadge state={sessionState(s, now)} />{' '}
                      {s.source === 'simulator' && <Badge tone="amber">Simulada</Badge>}
                    </td>
                    <td className="py-2 text-right">
                      <Link href={`/sessoes/${s.id}`} className="text-blue-600 hover:underline">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-medium">Quedas de tensão detectadas</h2>
        {data && data.anomalies.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma queda detectada nas sessões encerradas.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {data?.anomalies.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <strong>{a.plate}</strong> · {formatDateTime(a.started_at)} ·{' '}
                  {formatDuration(Date.parse(a.ended_at) - Date.parse(a.started_at))}
                </span>
                <span className="flex items-center gap-3">
                  <Badge tone="red">mín. {a.min_value} V</Badge>
                  <Link href={`/sessoes/${a.session_id}`} className="text-blue-600 hover:underline">
                    Ver sessão
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-medium">Veículos</h2>
        {canRegisterVehicles && <VehicleForm onCreated={() => setReload((n) => n + 1)} />}
        <ul className="mt-3 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {data?.vehicles.map((v) => (
            <li key={v.id} className="flex justify-between py-2">
              <span className="font-medium">{v.plate}</span>
              <span className="text-neutral-500">{[v.model, v.owner_name].filter(Boolean).join(' · ') || '—'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SessionBadge({ state }: { state: SessionState }) {
  if (state === 'live') return <Badge tone="green">Ao vivo</Badge>;
  if (state === 'stale') {
    return (
      <span title="Sessão aberta, mas sem leituras há mais de 2 minutos. Abra e encerre manualmente.">
        <Badge tone="amber">Sem sinal</Badge>
      </span>
    );
  }
  return <Badge>Encerrada</Badge>;
}

function VehicleForm({ onCreated }: { onCreated: () => void }) {
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [owner, setOwner] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch<Vehicle>('/api/vehicles', {
        method: 'POST',
        body: { plate, ...(model ? { model } : {}), ...(owner ? { owner_name: owner } : {}) },
      });
      setPlate('');
      setModel('');
      setOwner('');
      onCreated();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input className={input} placeholder="Placa (ABC-1D23)" aria-label="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} required />
      <input className={input} placeholder="Modelo" aria-label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
      <input className={input} placeholder="Proprietário" aria-label="Proprietário" value={owner} onChange={(e) => setOwner(e.target.value)} />
      <button type="submit" className={btn} disabled={busy}>
        Cadastrar
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}

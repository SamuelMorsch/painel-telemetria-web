'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Charts } from '../../../components/Charts';
import { DtcList } from '../../../components/DtcList';
import { Shell } from '../../../components/Shell';
import { Badge, Stat, btnGhost, card, input } from '../../../components/ui';
import { apiFetch, describeError } from '../../../lib/api';
import { useStoredUser } from '../../../lib/auth';
import {
  appendPoints,
  bucketToPoint,
  chooseBucketSeconds,
  formatDateTime,
  formatDuration,
  formatTime,
  isLow,
  mergeDtcs,
  readingToPoint,
  type Point,
} from '../../../lib/series';
import { streamSession, type StreamStatus } from '../../../lib/sse';
import type { AnomalyEvent, BucketRow, Dtc, Reading, Session, Vehicle } from '../../../lib/types';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell>
      <SessionView id={id} />
    </Shell>
  );
}

const statusText: Record<StreamStatus, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  idle: { label: 'Parado', tone: 'gray' },
  connecting: { label: 'Conectando…', tone: 'amber' },
  live: { label: 'Recebendo ao vivo', tone: 'green' },
  reconnecting: { label: 'Reconectando…', tone: 'amber' },
  closed: { label: 'Transmissão encerrada', tone: 'gray' },
};

function SessionView({ id }: { id: string }) {
  const { user } = useStoredUser();
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [plate, setPlate] = useState('');
  const [points, setPoints] = useState<Point[]>([]);
  const [bucketed, setBucketed] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [dtcs, setDtcs] = useState<Dtc[]>([]);
  const [voltageMin, setVoltageMin] = useState(13);
  const [voltageText, setVoltageText] = useState('13');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const hasSession = session !== null;
  const isOpen = session !== null && session.ended_at === null;
  const startedAt = session?.started_at;
  const endedAt = session?.ended_at ?? null;

  // 1) Dados da sessão e placa do veículo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await apiFetch<Session>(`/api/sessions/${id}`);
        const vehicles = await apiFetch<Vehicle[]>('/api/vehicles');
        if (cancelled) return;
        setSession(found);
        setPlate(vehicles.find((v) => v.id === found.vehicle_id)?.plate ?? '—');
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2) Histórico: ao vivo = últimas 300 leituras; encerrada = tudo (resumido se for longa)
  useEffect(() => {
    if (!startedAt) return;
    let cancelled = false;
    (async () => {
      try {
        if (isOpen) {
          const rows = await apiFetch<Reading[]>(`/api/sessions/${id}/readings?order=desc&limit=300`);
          if (!cancelled) {
            setPoints(rows.map(readingToPoint).reverse());
            setBucketed(false);
          }
          return;
        }
        const bucket = chooseBucketSeconds(startedAt, endedAt);
        if (bucket) {
          const rows = await apiFetch<BucketRow[]>(`/api/sessions/${id}/readings?bucket=${bucket}&limit=1000`);
          if (!cancelled) {
            setPoints(rows.map(bucketToPoint));
            setBucketed(true);
          }
        } else {
          const rows = await apiFetch<Reading[]>(`/api/sessions/${id}/readings?limit=5000`);
          if (!cancelled) {
            setPoints(rows.map(readingToPoint));
            setBucketed(false);
          }
        }
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, startedAt, endedAt, isOpen]);

  // Códigos de falha já registrados na sessão (recarrega quando ela encerra)
  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetch<Dtc[]>(`/api/sessions/${id}/dtcs`);
        if (!cancelled) setDtcs((current) => mergeDtcs(current, rows));
      } catch {
        // a lista fica como está; a transmissão ao vivo continua trazendo os novos
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, hasSession, isOpen]);

  // 3) Tempo real, enquanto a sessão estiver aberta
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    void streamSession(
      id,
      {
        onStatus: setStatus,
        onEvent: (message) => {
          try {
            if (message.event === 'readings') {
              const data = JSON.parse(message.data) as { readings: Reading[] };
              setPoints((current) => appendPoints(current, data.readings.map(readingToPoint)));
            } else if (message.event === 'dtcs') {
              const data = JSON.parse(message.data) as { dtcs: Dtc[] };
              setDtcs((current) => mergeDtcs(current, data.dtcs));
            } else if (message.event === 'ended') {
              const data = JSON.parse(message.data) as { ended_at: string };
              controller.abort();
              setStatus('closed');
              setSession((s) => (s ? { ...s, ended_at: data.ended_at } : s));
            }
          } catch {
            // mensagem malformada: ignora e segue
          }
        },
      },
      controller.signal,
    );
    return () => controller.abort();
  }, [id, isOpen]);

  // 4) Quedas de tensão: recalcula quando o limite muda e a cada 10 s se estiver ao vivo
  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await apiFetch<{ events: AnomalyEvent[] }>(
          `/api/sessions/${id}/anomalies?voltage_min=${voltageMin}`,
        );
        if (!cancelled) setAnomalies(result.events);
      } catch {
        // a próxima atualização tenta de novo
      }
    };
    const first = setTimeout(load, 300);
    const timer = isOpen ? setInterval(load, 10_000) : undefined;
    return () => {
      cancelled = true;
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [id, voltageMin, isOpen, hasSession]);

  const last = points.length > 0 ? points[points.length - 1] : undefined;
  const canEnd = isOpen && (user?.role === 'admin' || user?.role === 'mechanic');

  // Encerra uma sessão que ficou aberta (celular sem sinal, app fechado). Usa o horário da última leitura.
  async function endSession() {
    if (!window.confirm('Encerrar esta sessão? As quedas de tensão serão analisadas e gravadas.')) return;
    setEnding(true);
    try {
      const result = await apiFetch<Session>(`/api/sessions/${id}/end`, {
        method: 'PATCH',
        body: last ? { ended_at: new Date(last.t).toISOString() } : {},
      });
      setSession((s) => (s ? { ...s, ended_at: result.ended_at } : s));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setEnding(false);
    }
  }
  const lowNow = isLow(last, voltageMin);
  const fmt = (n: number | null | undefined, digits = 0) => (n === null || n === undefined ? '—' : n.toFixed(digits));

  if (error && !session) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Voltar
          </Link>
          <h1 className="text-xl font-semibold">{plate || 'Carregando…'}</h1>
          {session && (
            <p className="text-sm text-neutral-500">
              Início {formatDateTime(session.started_at)}
              {session.ended_at
                ? ` · duração ${formatDuration(Date.parse(session.ended_at) - Date.parse(session.started_at))}`
                : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session?.source === 'simulator' && <Badge tone="amber">Simulada</Badge>}
          {isOpen && last && <span className="text-xs text-neutral-500">Última leitura {formatTime(last.t)}</span>}
          {isOpen ? (
            <Badge tone={statusText[status].tone}>{statusText[status].label}</Badge>
          ) : (
            session && <Badge>Encerrada</Badge>
          )}
          {canEnd && (
            <button type="button" className={btnGhost} onClick={endSession} disabled={ending}>
              {ending ? 'Encerrando…' : 'Encerrar sessão'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tensão" value={fmt(last?.v, 2)} unit="V" alert={lowNow} />
        <Stat label="Rotação" value={fmt(last?.rpm)} unit="rpm" />
        <Stat label="Velocidade" value={fmt(last?.speed)} unit="km/h" />
        <Stat label="Temp. do motor" value={fmt(last?.temp)} unit="°C" />
      </div>

      {lowNow && isOpen && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Queda de tensão agora: {fmt(last?.v, 2)} V com o motor a {fmt(last?.rpm)} rpm.
        </p>
      )}

      <Charts points={points} anomalies={anomalies} dtcs={dtcs} voltageMin={voltageMin} bucketed={bucketed} />

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-medium">Quedas de tensão ({anomalies.length})</h2>
          <label className="text-sm">
            <span className="mr-2 text-neutral-500">Limite (V)</span>
            <input
              className={`${input} !w-24`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="5"
              max="20"
              value={voltageText}
              onChange={(e) => {
                setVoltageText(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(n) && n >= 5 && n <= 20) setVoltageMin(n);
              }}
            />
          </label>
        </div>
        <p className="mb-3 text-xs text-neutral-500">
          Conta como queda quando o motor gira (≥ 700 rpm) e a tensão fica abaixo do limite por pelo menos 2 leituras
          seguidas. Ajuste o limite para calibrar a sensibilidade.
        </p>
        {anomalies.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma queda detectada com este limite.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            {anomalies.map((a) => {
              const details = a.details as { samples?: number; max_rpm?: number };
              return (
                <li key={a.started_at} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {formatDateTime(a.started_at)} · {formatDuration(Date.parse(a.ended_at) - Date.parse(a.started_at))}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone="red">mín. {a.min_value} V</Badge>
                    {details.max_rpm !== undefined && <Badge>até {details.max_rpm} rpm</Badge>}
                    {details.samples !== undefined && <Badge>{details.samples} leituras</Badge>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DtcList dtcs={dtcs} />
    </div>
  );
}

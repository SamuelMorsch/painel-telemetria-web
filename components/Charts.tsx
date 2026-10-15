'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatTime, groupDtcMarkers, type Point } from '../lib/series';
import type { AnomalyEvent, Dtc } from '../lib/types';
import { card } from './ui';

interface Props {
  points: Point[];
  anomalies: AnomalyEvent[];
  dtcs: Dtc[];
  voltageMin: number;
  /** true quando cada ponto é o resumo de um intervalo (mostra a tensão mínima). */
  bucketed: boolean;
}

// Cores do balão vêm de variáveis CSS, para ficar legível no modo claro e no escuro
const tooltipStyle = {
  background: 'var(--tooltip-bg)',
  color: 'var(--tooltip-fg)',
  border: '1px solid var(--tooltip-border)',
  borderRadius: 8,
};

const timeAxis = {
  dataKey: 't',
  type: 'number' as const,
  domain: ['dataMin', 'dataMax'] as ['dataMin', 'dataMax'],
  tickFormatter: (value: number) => formatTime(value),
  minTickGap: 40,
};

/** Tensão (com o limite e as quedas destacadas) e rotação. */
export function Charts({ points, anomalies, dtcs, voltageMin, bucketed }: Props) {
  const markers = useMemo(() => groupDtcMarkers(dtcs), [dtcs]);

  const [lo, hi] = useMemo(() => {
    const values = points.flatMap((p) => [p.v, p.v2]).filter((v): v is number => v !== null);
    return [Math.floor(Math.min(voltageMin, ...values) - 0.5), Math.ceil(Math.max(15, ...values) + 0.5)];
  }, [points, voltageMin]);

  if (points.length === 0) {
    return (
      <div className={`${card} flex h-72 items-center justify-center text-sm text-neutral-500`}>
        Aguardando leituras…
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className={card} aria-label="Gráfico de tensão">
        <h2 className="mb-2 text-sm font-medium">
          {bucketed ? 'Tensão mínima por intervalo (V)' : 'Tensão (V)'}
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 24, right: 28, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis {...timeAxis} />
              <YAxis domain={[lo, hi]} width={44} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => formatTime(Number(label))} />
              <Legend />
              {anomalies.map((a) => (
                <ReferenceArea
                  key={a.started_at}
                  x1={Date.parse(a.started_at)}
                  x2={Date.parse(a.ended_at)}
                  fill="#ef4444"
                  fillOpacity={0.18}
                  stroke="#ef4444"
                  strokeOpacity={0.4}
                />
              ))}
              {markers.map((m) => (
                <ReferenceLine
                  key={m.t}
                  x={m.t}
                  stroke="#f59e0b"
                  strokeDasharray="2 3"
                  label={{ value: m.label, position: 'top', fill: '#f59e0b', fontSize: 11 }}
                />
              ))}
              <ReferenceLine
                y={voltageMin}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{ value: `limite ${voltageMin} V`, position: 'insideBottomRight', fill: '#ef4444', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="v"
                name={bucketed ? 'Mínima' : 'Adaptador (AT RV)'}
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
              {!bucketed && (
                <Line
                  type="monotone"
                  dataKey="v2"
                  name="ECU (PID 01 42)"
                  stroke="#9333ea"
                  dot={false}
                  strokeDasharray="4 3"
                  isAnimationActive={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={card} aria-label="Gráfico de rotação">
        <h2 className="mb-2 text-sm font-medium">{bucketed ? 'Rotação máxima por intervalo (rpm)' : 'Rotação (rpm)'}</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis {...timeAxis} />
              <YAxis width={44} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => formatTime(Number(label))} />
              <Line
                type="monotone"
                dataKey="rpm"
                name="rpm"
                stroke="#16a34a"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

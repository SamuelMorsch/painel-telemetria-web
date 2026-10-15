import { formatDateTime } from '../lib/series';
import type { Dtc, DtcStatus } from '../lib/types';
import { Badge, card } from './ui';

const statusLabel: Record<DtcStatus, { text: string; tone: 'amber' | 'red' }> = {
  pending: { text: 'Pendente', tone: 'amber' },
  stored: { text: 'Confirmada', tone: 'red' },
  permanent: { text: 'Permanente', tone: 'red' },
};

/** Códigos de falha lidos do veículo, com a explicação, o estado e o horário em que apareceram. */
export function DtcList({ dtcs }: { dtcs: Dtc[] }) {
  return (
    <section className={card} aria-label="Códigos de falha">
      <h2 className="mb-1 font-medium">Códigos de falha (DTC) ({dtcs.length})</h2>
      <p className="mb-3 text-xs text-neutral-500">
        São os códigos que a central do veículo registrou. <strong>Pendente</strong> quer dizer que o veículo
        detectou o problema, mas ainda não confirmou: em defeitos intermitentes, costuma aparecer antes da luz
        de aviso. Os marcadores laranja no gráfico mostram quando cada código surgiu.
      </p>

      {dtcs.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum código de falha registrado nesta sessão.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {dtcs.map((d) => (
            <li key={`${d.code}-${d.status}`} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <div className="min-w-0">
                <p>
                  <span className="font-mono font-semibold">{d.code}</span>{' '}
                  <span className="text-neutral-600 dark:text-neutral-300">{d.description}</span>
                </p>
                <p className="text-xs text-neutral-500">{formatDateTime(d.detected_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {d.electrical && <Badge tone="blue">Sistema elétrico</Badge>}
                <Badge tone={statusLabel[d.status].tone}>{statusLabel[d.status].text}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

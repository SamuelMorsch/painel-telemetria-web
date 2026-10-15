import type { BucketRow, Dtc, Reading, Session } from './types';

/** Um ponto dos gráficos. `t` em milissegundos. */
export interface Point {
  t: number;
  v: number | null;    // tensão principal (adaptador, ou ECU se o adaptador não mediu)
  v2: number | null;   // tensão informada pela ECU
  rpm: number | null;
  speed: number | null;
  temp: number | null;
}

export const RPM_RUNNING = 700;

export function readingToPoint(r: Reading): Point {
  return {
    t: Date.parse(r.time),
    v: r.battery_voltage ?? r.control_module_voltage ?? null,
    v2: r.control_module_voltage,
    rpm: r.rpm,
    speed: r.speed_kmh,
    temp: r.coolant_temp_c,
  };
}

/** No histórico resumido mostramos a tensão MÍNIMA do intervalo: é o pior caso, o que importa para achar defeitos. */
export function bucketToPoint(b: BucketRow): Point {
  return { t: Date.parse(b.time), v: b.voltage_min, v2: null, rpm: b.rpm_max, speed: b.speed_max, temp: b.coolant_max };
}

/** Junta pontos novos aos atuais: ordena, descarta repetidos (mesmo instante) e mantém só os últimos `max`. */
export function appendPoints(current: Point[], incoming: Point[], max = 600): Point[] {
  const merged = [...current, ...incoming].sort((a, b) => a.t - b.t);
  const unique: Point[] = [];
  for (const p of merged) {
    if (unique.length > 0 && unique[unique.length - 1].t === p.t) unique[unique.length - 1] = p;
    else unique.push(p);
  }
  return unique.length > max ? unique.slice(unique.length - max) : unique;
}

/** Sessões longas são resumidas no servidor (~500 pontos). Devolve o intervalo em segundos, ou undefined para dados brutos. */
export function chooseBucketSeconds(startedAt: string, endedAt: string | null, now = Date.now()): number | undefined {
  const seconds = ((endedAt ? Date.parse(endedAt) : now) - Date.parse(startedAt)) / 1000;
  return seconds > 1200 ? Math.ceil(seconds / 500) : undefined;
}

/** A leitura é "queda de tensão" se o motor gira e a tensão está abaixo do limite (mesma regra da API). */
export function isLow(p: Point | undefined, voltageMin: number, rpmMin = RPM_RUNNING): boolean {
  return !!p && p.v !== null && p.rpm !== null && p.rpm >= rpmMin && p.v < voltageMin;
}

export const formatTime = (ms: number): string => new Date(ms).toLocaleTimeString('pt-BR');
export const formatDateTime = (iso: string): string => new Date(iso).toLocaleString('pt-BR');

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min ${total % 60} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Junta códigos novos aos atuais: sem repetir (mesmo código e estado) e em ordem de aparição. */
export function mergeDtcs(current: Dtc[], incoming: Dtc[]): Dtc[] {
  const byKey = new Map<string, Dtc>();
  for (const d of [...current, ...incoming]) {
    const key = `${d.code}|${d.status}`;
    if (!byKey.has(key)) byKey.set(key, d);
  }
  return [...byKey.values()].sort(
    (a, b) => Date.parse(a.detected_at) - Date.parse(b.detected_at) || a.code.localeCompare(b.code),
  );
}

export interface DtcMarker {
  t: number;
  label: string;
}

/** Um marcador por instante no gráfico; códigos do mesmo instante viram um rótulo só ("P0562 P0622"). */
export function groupDtcMarkers(dtcs: Dtc[]): DtcMarker[] {
  const byTime = new Map<number, string[]>();
  for (const d of dtcs) {
    const t = Date.parse(d.detected_at);
    const codes = byTime.get(t) ?? [];
    if (!codes.includes(d.code)) codes.push(d.code);
    byTime.set(t, codes);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([t, codes]) => ({ t, label: codes.join(' ') }));
}

/** Sessão aberta sem leituras há mais que isto é considerada "sem sinal" (o app não fecha sozinho a sessão). */
export const LIVE_WINDOW_MS = 120_000;

export type SessionState = 'live' | 'stale' | 'ended';

/** 'live' = recebendo dados; 'stale' = aberta, mas sem dados recentes; 'ended' = encerrada. */
export function sessionState(
  session: Pick<Session, 'ended_at' | 'last_reading_at' | 'started_at'>,
  now: number,
): SessionState {
  if (session.ended_at) return 'ended';
  const reference = Date.parse(session.last_reading_at ?? session.started_at);
  return now - reference <= LIVE_WINDOW_MS ? 'live' : 'stale';
}

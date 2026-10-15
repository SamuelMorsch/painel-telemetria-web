import {
  appendPoints,
  bucketToPoint,
  chooseBucketSeconds,
  formatDuration,
  groupDtcMarkers,
  isLow,
  mergeDtcs,
  readingToPoint,
  sessionState,
  type Point,
} from './series';
import type { Dtc } from './types';

const point = (t: number, v: number | null = 14, rpm: number | null = 2000): Point => ({
  t,
  v,
  v2: null,
  rpm,
  speed: 0,
  temp: 0,
});

describe('readingToPoint', () => {
  const base = { seq: 1, time: '2026-10-14T12:00:00Z', rpm: 2000, speed_kmh: 50, coolant_temp_c: 90 };

  test('usa a tensão do adaptador e cai para a da ECU', () => {
    expect(readingToPoint({ ...base, battery_voltage: 14.1, control_module_voltage: 14.2 }).v).toBe(14.1);
    expect(readingToPoint({ ...base, battery_voltage: null, control_module_voltage: 14.2 }).v).toBe(14.2);
    expect(readingToPoint({ ...base, battery_voltage: null, control_module_voltage: null }).v).toBeNull();
  });
});

describe('bucketToPoint', () => {
  test('mostra a tensão mínima do intervalo', () => {
    const p = bucketToPoint({
      time: '2026-10-14T12:00:00Z',
      voltage_min: 11.4,
      voltage_avg: 13,
      voltage_max: 14.2,
      rpm_max: 4000,
      speed_max: 100,
      coolant_max: 92,
      samples: 10,
    });
    expect(p.v).toBe(11.4);
    expect(p.rpm).toBe(4000);
  });
});

describe('appendPoints', () => {
  test('ordena, remove repetidos (o mais novo vence) e limita o tamanho', () => {
    const out = appendPoints([point(3, 3), point(1, 1)], [point(2, 2), point(3, 33)]);
    expect(out.map((p) => [p.t, p.v])).toEqual([[1, 1], [2, 2], [3, 33]]);

    const many = Array.from({ length: 10 }, (_, i) => point(i));
    expect(appendPoints([], many, 3).map((p) => p.t)).toEqual([7, 8, 9]);
  });
});

describe('chooseBucketSeconds', () => {
  test('sessão curta usa dados brutos; longa vira ~500 pontos', () => {
    expect(chooseBucketSeconds('2026-10-14T12:00:00Z', '2026-10-14T12:10:00Z')).toBeUndefined();
    expect(chooseBucketSeconds('2026-10-14T12:00:00Z', '2026-10-14T14:00:00Z')).toBe(15);
  });
});

describe('isLow', () => {
  test('segue a mesma regra da API (motor girando e tensão abaixo do limite)', () => {
    expect(isLow(point(0, 11.5, 4000), 13)).toBe(true);
    expect(isLow(point(0, 12.4, 0), 13)).toBe(false);
    expect(isLow(point(0, 11.5, null), 13)).toBe(false);
    expect(isLow(point(0, null, 4000), 13)).toBe(false);
    expect(isLow(undefined, 13)).toBe(false);
  });
});

describe('formatDuration', () => {
  test('segundos, minutos e horas', () => {
    expect(formatDuration(9000)).toBe('9 s');
    expect(formatDuration(125000)).toBe('2 min 5 s');
    expect(formatDuration(3_900_000)).toBe('1 h 5 min');
  });
});

const dtc = (code: string, status: Dtc['status'], at: string): Dtc => ({
  code,
  status,
  detected_at: at,
  description: 'x',
  electrical: false,
  scope: 'generic',
});

describe('mergeDtcs', () => {
  test('não repete o mesmo código no mesmo estado e ordena por horário', () => {
    const a = dtc('P0562', 'pending', '2026-10-14T12:00:48Z');
    const b = dtc('P0562', 'stored', '2026-10-14T12:00:55Z');
    const c = dtc('P0622', 'stored', '2026-10-14T12:00:55Z');
    const out = mergeDtcs([b], [c, a, { ...b, detected_at: '2026-10-14T13:00:00Z' }]);
    expect(out.map((d) => `${d.code}/${d.status}`)).toEqual(['P0562/pending', 'P0562/stored', 'P0622/stored']);
    expect(out[1].detected_at).toBe('2026-10-14T12:00:55Z'); // o primeiro registro vence
  });
});

describe('groupDtcMarkers', () => {
  test('um marcador por instante; códigos simultâneos viram um rótulo só', () => {
    const markers = groupDtcMarkers([
      dtc('P0562', 'pending', '2026-10-14T12:00:48Z'),
      dtc('P0562', 'stored', '2026-10-14T12:00:55Z'),
      dtc('P0622', 'stored', '2026-10-14T12:00:55Z'),
    ]);
    expect(markers.map((m) => m.label)).toEqual(['P0562', 'P0562 P0622']);
    expect(markers[0].t).toBeLessThan(markers[1].t);
  });
});

describe('sessionState', () => {
  const base = { started_at: '2026-10-14T12:00:00Z', ended_at: null, last_reading_at: null as string | null };
  const at = (iso: string) => Date.parse(iso);

  test('encerrada tem prioridade', () => {
    expect(sessionState({ ...base, ended_at: '2026-10-14T12:05:00Z' }, at('2026-10-15T00:00:00Z'))).toBe('ended');
  });

  test('aberta com leitura recente está ao vivo', () => {
    const s = { ...base, last_reading_at: '2026-10-14T12:05:00Z' };
    expect(sessionState(s, at('2026-10-14T12:06:30Z'))).toBe('live');
  });

  test('aberta sem leituras há mais de 2 minutos fica "sem sinal"', () => {
    const s = { ...base, last_reading_at: '2026-10-14T12:05:00Z' };
    expect(sessionState(s, at('2026-10-14T12:07:01Z'))).toBe('stale');
  });

  test('sessão recém-aberta, ainda sem leituras, conta como ao vivo; esquecida há horas, não', () => {
    expect(sessionState(base, at('2026-10-14T12:01:00Z'))).toBe('live');
    expect(sessionState(base, at('2026-10-14T15:00:00Z'))).toBe('stale');
  });
});

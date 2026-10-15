export type Role = 'admin' | 'mechanic' | 'driver';

export interface User {
  id: string;
  workshop_id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  vehicle_id: string;
  started_at: string;
  ended_at: string | null;
  /** Instante da última leitura recebida (vem da listagem e do detalhe da sessão). */
  last_reading_at?: string | null;
  source: 'obd' | 'simulator';
  app_version: string | null;
  created_at: string;
}

export interface Reading {
  seq: number;
  time: string;
  battery_voltage: number | null;
  control_module_voltage: number | null;
  rpm: number | null;
  speed_kmh: number | null;
  coolant_temp_c: number | null;
}

/** Linha do histórico resumido (parâmetro `bucket` da API). */
export interface BucketRow {
  time: string;
  voltage_min: number | null;
  voltage_avg: number | null;
  voltage_max: number | null;
  rpm_max: number | null;
  speed_max: number | null;
  coolant_max: number | null;
  samples: number;
}

export interface AnomalyEvent {
  kind: string;
  started_at: string;
  ended_at: string;
  min_value: number;
  details: Record<string, unknown>;
}

export interface StoredAnomaly extends AnomalyEvent {
  id: string;
  session_id: string;
  vehicle_id: string;
  plate: string;
}

export type DtcStatus = 'stored' | 'pending' | 'permanent';

/** Código de falha (DTC) lido do veículo, já com a descrição em português. */
export interface Dtc {
  code: string;
  status: DtcStatus;
  detected_at: string;
  description: string;
  /** Ligado a carga, bateria ou motor de partida. */
  electrical: boolean;
  scope: 'generic' | 'manufacturer' | 'mixed' | 'unknown';
}

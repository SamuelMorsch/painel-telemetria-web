import { clearSession, getToken } from './auth';

/** Vazio em produção (o painel e a API ficam no mesmo domínio). Em desenvolvimento, aponta para a API. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** Chama a API com o token do usuário. 401 com token = sessão expirada: limpa o login. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const hasBody = options.body !== undefined;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await res.text();
  const data = text ? parseJson(text) : null;

  if (!res.ok) {
    if (res.status === 401 && token) clearSession();
    const code = typeof data?.error === 'string' ? data.error : 'error';
    const message = typeof data?.message === 'string' ? data.message : `Erro ${res.status}`;
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

/** Texto amigável para mostrar ao usuário. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Sem conexão com o servidor.';
  if (error instanceof Error) return error.message;
  return 'Erro inesperado.';
}

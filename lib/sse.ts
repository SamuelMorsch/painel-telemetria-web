import { API_URL } from './api';
import { getToken } from './auth';

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Extrai as mensagens COMPLETAS de um texto SSE e devolve o resto (mensagem pela metade).
 * Formato: blocos separados por linha em branco, com linhas "event: x" e "data: y".
 * Linhas que começam com ":" são comentários (o "ping" do servidor) e são ignoradas.
 */
export function parseSse(buffer: string): { messages: SseMessage[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const messages: SseMessage[] = [];

  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length > 0) messages.push({ event, data: data.join('\n') });
  }
  return { messages, rest };
}

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'closed';

export interface StreamHandlers {
  onEvent: (message: SseMessage) => void;
  onStatus: (status: StreamStatus) => void;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

/**
 * Abre a transmissão ao vivo de uma sessão e reconecta sozinho se a conexão cair.
 * Usa fetch (e não EventSource) porque o EventSource não permite enviar o cabeçalho
 * Authorization, e não queremos o token na URL. Termina quando `signal` é cancelado
 * ou quando o servidor responde 401/404.
 */
export async function streamSession(sessionId: string, handlers: StreamHandlers, signal: AbortSignal): Promise<void> {
  let attempt = 0;

  while (!signal.aborted) {
    handlers.onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}/stream`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}`, Accept: 'text/event-stream' },
        signal,
      });
      if (res.status === 401 || res.status === 404) {
        handlers.onStatus('closed');
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      attempt = 0;
      handlers.onStatus('live');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.rest;
        parsed.messages.forEach(handlers.onEvent);
      }
    } catch {
      if (signal.aborted) return;
    }
    if (signal.aborted) return;
    attempt += 1;
    await sleep(Math.min(1000 * 2 ** attempt, 15_000), signal);
  }
}

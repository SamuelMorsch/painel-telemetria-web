import { parseSse } from './sse';

describe('parseSse', () => {
  test('lê ready, ignora retry e ping, e devolve a mensagem incompleta como resto', () => {
    const raw =
      'retry: 3000\n\nevent: ready\ndata: {"session_id":"x"}\n\n: ping\n\nevent: readings\ndata: {"readings":[]}\n\nevent: readi';
    const { messages, rest } = parseSse(raw);
    expect(messages).toEqual([
      { event: 'ready', data: '{"session_id":"x"}' },
      { event: 'readings', data: '{"readings":[]}' },
    ]);
    expect(rest).toBe('event: readi');
  });

  test('completa uma mensagem cortada ao meio e aceita \\r\\n', () => {
    const first = parseSse('event: readings\r\ndata: {"a"');
    expect(first.messages).toHaveLength(0);
    const second = parseSse(first.rest + ':1}\r\n\r\n');
    expect(second.messages).toEqual([{ event: 'readings', data: '{"a":1}' }]);
  });

  test('mensagem sem "event" é do tipo message; várias linhas data são unidas', () => {
    const { messages } = parseSse('data: a\ndata: b\n\n');
    expect(messages).toEqual([{ event: 'message', data: 'a\nb' }]);
  });
});

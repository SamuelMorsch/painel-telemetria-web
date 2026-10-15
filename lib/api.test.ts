import { ApiError, apiFetch, describeError } from './api';
import { getToken, saveSession } from './auth';
import type { User } from './types';

const user: User = {
  id: 'u1',
  workshop_id: 'w1',
  email: 'a@b.com',
  role: 'admin',
  created_at: '2026-10-14T00:00:00Z',
};

function mockFetch(status: number, body?: unknown) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => window.sessionStorage.clear());

describe('apiFetch', () => {
  test('envia o token no cabeçalho Authorization', async () => {
    saveSession('tok123', user);
    const fetchMock = mockFetch(200, [{ id: 1 }]);

    const data = await apiFetch<unknown[]>('/api/vehicles');

    expect(data).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/vehicles');
    expect(init.headers.Authorization).toBe('Bearer tok123');
  });

  test('sem login não envia Authorization; com corpo, manda JSON', async () => {
    const fetchMock = mockFetch(200, { ok: true });

    await apiFetch('/api/auth/login', { method: 'POST', body: { email: 'a@b.com' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"email":"a@b.com"}');
  });

  test('401 com login ativo limpa a sessão (token expirado) e lança ApiError', async () => {
    saveSession('velho', user);
    mockFetch(401, { error: 'unauthorized', message: 'Token inválido ou expirado.' });

    await expect(apiFetch('/api/vehicles')).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    expect(getToken()).toBeNull();
  });

  test('401 no login (sem token) devolve a mensagem da API', async () => {
    mockFetch(401, { error: 'invalid_credentials', message: 'E-mail ou senha inválidos.' });

    await expect(apiFetch('/api/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'E-mail ou senha inválidos.',
    );
  });

  test('erro sem corpo JSON usa uma mensagem padrão', async () => {
    mockFetch(502);
    await expect(apiFetch('/api/x')).rejects.toThrow('Erro 502');
  });
});

describe('describeError', () => {
  test('traduz os tipos de erro em texto para o usuário', () => {
    expect(describeError(new ApiError(400, 'x', 'Dados inválidos.'))).toBe('Dados inválidos.');
    expect(describeError(new TypeError('Failed to fetch'))).toBe('Sem conexão com o servidor.');
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('?')).toBe('Erro inesperado.');
  });
});

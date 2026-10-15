import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
}));

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  mockPush.mockClear();
  window.sessionStorage.clear();
});

test('login com sucesso guarda o token e vai para o painel', async () => {
  mockFetch(200, {
    token: 'abc',
    user: { id: 'u', workshop_id: 'w', email: 'a@b.com', role: 'admin', created_at: '2026-10-14T00:00:00Z' },
  });
  render(<LoginPage />);

  fill('E-mail', 'a@b.com');
  fill('Senha', 'senha-forte-123');
  fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  expect(window.sessionStorage.getItem('telemetria.token')).toBe('abc');
});

test('credenciais inválidas mostram a mensagem da API e não navegam', async () => {
  mockFetch(401, { error: 'invalid_credentials', message: 'E-mail ou senha inválidos.' });
  render(<LoginPage />);

  fill('E-mail', 'a@b.com');
  fill('Senha', 'errada-errada');
  fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);

  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  expect(mockPush).not.toHaveBeenCalled();
  expect(window.sessionStorage.getItem('telemetria.token')).toBeNull();
});

test('alterna para o cadastro e envia o nome da oficina', async () => {
  const fetchMock = mockFetch(201, {
    token: 'novo',
    user: { id: 'u', workshop_id: 'w', email: 'a@b.com', role: 'admin', created_at: '2026-10-14T00:00:00Z' },
  });
  render(<LoginPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar uma oficina' }));
  fill('Nome da oficina', 'Autoelétrica Morsch');
  fill('E-mail', 'a@b.com');
  fill('Senha', 'senha-forte-123');
  fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar oficina' }).closest('form')!);

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/register');
  expect(JSON.parse(init.body)).toEqual({
    workshop_name: 'Autoelétrica Morsch',
    email: 'a@b.com',
    password: 'senha-forte-123',
  });
});

import { render, screen } from '@testing-library/react';
import { DtcList } from './DtcList';
import type { Dtc } from '../lib/types';

const base: Dtc = {
  code: 'P0562',
  status: 'stored',
  detected_at: '2026-10-14T12:00:55Z',
  description: 'Tensão do sistema baixa',
  electrical: true,
  scope: 'generic',
};

test('mostra mensagem quando não há códigos', () => {
  render(<DtcList dtcs={[]} />);
  expect(screen.getByText('Nenhum código de falha registrado nesta sessão.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /\(0\)/ })).toBeInTheDocument();
});

test('lista o código, a descrição, o estado e a marca de sistema elétrico', () => {
  render(
    <DtcList
      dtcs={[
        { ...base, status: 'pending', detected_at: '2026-10-14T12:00:48Z' },
        base,
        { ...base, code: 'P0300', description: 'Falhas de combustão aleatórias', electrical: false },
      ]}
    />,
  );

  expect(screen.getAllByText('P0562')).toHaveLength(2);
  expect(screen.getByText('P0300')).toBeInTheDocument();
  expect(screen.getByText('Falhas de combustão aleatórias')).toBeInTheDocument();
  expect(screen.getByText('Pendente', { selector: 'span' })).toBeInTheDocument();
  expect(screen.getAllByText('Confirmada')).toHaveLength(2);
  expect(screen.getAllByText('Sistema elétrico')).toHaveLength(2); // só os dois P0562
});

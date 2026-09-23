import { render, screen } from '@testing-library/react';
import Home from './page';

// Simula a biblioteca do Supabase e a resposta do banco de dados
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: jest.fn().mockResolvedValue({
            data: [
              { 
                id: 1, 
                codigo: 'P0043', 
                descricao: 'Circuito do aquecedor da sonda lambda', 
                data_registro: '2026-09-23T20:28:25' 
              }
            ],
            error: null
          })
        })
      })
    }),
    channel: () => ({
      on: () => ({
        subscribe: jest.fn()
      })
    }),
    removeChannel: jest.fn()
  })
}));

describe('Painel da Oficina', () => {
  it('renderiza o cabeçalho e a lista de falhas do OBD-II', async () => {
    render(<Home />);
    
    // Verifica se o título principal carregou
    expect(screen.getByText('Painel da Oficina - Monitorização')).toBeInTheDocument();
    
    // Aguarda a promessa do banco de dados falso e verifica se a falha aparece no ecrã
    expect(await screen.findByText('P0043')).toBeInTheDocument();
    expect(screen.getByText('Circuito do aquecedor da sonda lambda')).toBeInTheDocument();
  });
});
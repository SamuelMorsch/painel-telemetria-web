# Telemetria Automotiva Remota - Painel Web

Painel da oficina do TCC (Engenharia de Software, Católica SC). O mecânico acompanha, **em
tempo real**, a tensão elétrica, a rotação, a velocidade e a temperatura de um veículo que
está rodando na rua, e vê onde ocorreram **quedas de tensão** com o motor girando: o tipo de
defeito intermitente que não aparece com o carro parado na oficina.

## Ecossistema

| Módulo | Repositório |
|---|---|
| App Android (gateway OBD-II) | [telemetria_obd2_app](https://github.com/SamuelMorsch/telemetria_obd2_app) |
| API | [telemetria-api](https://github.com/SamuelMorsch/telemetria-api) |
| Painel web (este repositório) | [painel-telemetria-web](https://github.com/SamuelMorsch/painel-telemetria-web) |

## O que o painel faz
- **Login** por oficina (a conta é criada na própria tela).
- **Visão geral:** veículos, sessões recentes (com selo "Ao vivo"), quedas de tensão detectadas.
- **Sessão ao vivo:** gráficos de tensão e rotação atualizados a cada leitura, valores atuais
  e alerta quando a tensão cai com o motor girando.
- **Sessão encerrada:** histórico completo (resumido automaticamente em sessões longas, mostrando
  a tensão **mínima** de cada intervalo) com as quedas destacadas no gráfico.
- **Calibração:** o limite de tensão que define uma "queda" pode ser ajustado na tela.

O painel consome **somente a API** (nenhum banco é acessado direto do navegador). O tempo real
usa Server-Sent Events lidos com `fetch`, para enviar o token no cabeçalho e não na URL.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Jest + Testing Library.
Decisões em [`docs/adr`](docs/adr).

## Rodando localmente
Requer Node 22+. Aponte o painel para uma API em execução:

```bash
npm install
cp .env.example .env.local      # define NEXT_PUBLIC_API_URL
npm run dev                     # http://localhost:3001
```
A API precisa liberar a origem do painel em `CORS_ORIGINS` (ex.: `http://localhost:3001`).

## Testes
```bash
npm test                        # Jest com relatório de cobertura
```

## Produção
O CI (`.github/workflows/ci.yml`) roda os testes, faz o build e publica a imagem Docker no
GitHub Container Registry (`ghcr.io/samuelmorsch/painel-telemetria-web`). O servidor apenas
baixa a imagem: não há cópia de arquivos por SSH. Em produção o painel e a API ficam no mesmo
domínio (o Caddy encaminha `/api` para a API e o resto para o painel), então
`NEXT_PUBLIC_API_URL` fica vazio. Ver o repositório da API, pasta `infra/`.

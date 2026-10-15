# ADR 0001 - O painel consome só a API; token em sessionStorage; tempo real com fetch

**Status:** aceita

## Contexto
A versão 1 do painel lia o banco (Supabase) direto do navegador, com uma chave pública, e
usava o Realtime do fornecedor. Isso contornava a API, expunha os dados e é vetado pelo
Playbook do curso (plataforma BaaS). Na versão 2 há login por oficina.

## Decisão
- **Só a API.** Todo dado vem de `/api`. Nenhuma biblioteca de banco no frontend.
- **Token JWT em `sessionStorage`.** Some ao fechar a aba e não é enviado automaticamente a
  outros sites (ao contrário de cookies, não há risco de CSRF). Cookie `httpOnly` seria mais
  resistente a XSS, mas exigiria um servidor intermediário (BFF) para repassar chamadas,
  streams incluídos. Para o escopo do TCC, optou-se pelo mais simples, com validade curta (8 h),
  sem scripts de terceiros e cabeçalhos de segurança.
- **Tempo real com `fetch` + parser de SSE próprio**, em vez de `EventSource`, porque o
  `EventSource` não envia o cabeçalho Authorization, e colocar o token na URL o deixaria nos
  logs do servidor. Reconecta sozinho com espera crescente.
- **Mesmo domínio** em produção (Caddy): sem CORS, sem URL de API para configurar.
- **Imagem Docker construída no CI** e publicada no GHCR; o servidor só faz `pull`. A
  máquina de produção (1 GB de RAM) não precisa compilar o Next.js.

## Consequências
- (+) Superfície de ataque menor, deploy reprodutível e sem SSH.
- (-) Um XSS no painel poderia ler o token. Mitigação: sem HTML injetado, sem scripts externos.
- (-) O login não sobrevive ao fechamento da aba (decisão consciente).

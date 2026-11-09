# Como contribuir

Obrigado pelo interesse! Este repositório é o painel web do sistema de telemetria automotiva remota
(veja o [README](README.md) deste módulo e o
[README principal](https://github.com/SamuelMorsch/telemetria-api) do sistema).

## Preparando o ambiente
Requer Node 22+.

```bash
npm install
cp .env.example .env.local     # aponte NEXT_PUBLIC_API_URL para uma API em execução
npm run dev                    # http://localhost:3001
npm test
npm run lint
```
Se quiser testar sem um carro, o simulador do [repositório da API](https://github.com/SamuelMorsch/telemetria-api)
(`scripts/simulate.js`) gera sessões com quedas de tensão.

## Fluxo de trabalho
1. Crie uma branch a partir da `main`, com um nome que diga o que muda (`feat/...`, `fix/...`).
2. Faça as alterações **com testes** quando mudar comportamento.
3. Mensagens de commit seguem o padrão do histórico: `feat:`, `fix:`, `ci:`, `docs:`,
   `refactor:`, `build:` ou `chore:`, seguido de uma frase curta.
4. Abra um Pull Request para a `main`. Ele só deve ser juntado quando o **CI** estiver verde
   (testes, build e imagem Docker) e o **SonarQube Cloud** não apontar problemas novos.
5. Mudanças de arquitetura relevantes ganham uma nova [ADR](docs/adr).

## Atenção
- Cada merge na `main` é publicado em produção em poucos minutos. Evite juntar durante testes de campo.
- **Nunca** faça commit do `.env.local`, de senhas ou de tokens.
- Para relatar uma vulnerabilidade, escreva para samuel.morsch@catolicasc.edu.br em vez de abrir uma issue pública.

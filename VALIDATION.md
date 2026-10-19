# Validação e diagnóstico do ambiente

**Registro histórico da fundação.** A auditoria posterior ampliou os testes para 95 e corrigiu regras, sessão e persistência. O estado atual está em [AUDIT_REPORT.md](AUDIT_REPORT.md); os números de 42 testes abaixo descrevem a execução anterior.

Registro da sessão de desenvolvimento em **19/10/2026**. Não substitui CI ou validação em dispositivo.

## Conectividade

- Node disponível: v24.19.0. npm: 11.9.0.
- Registro configurado: `https://registry.npmjs.org/`.
- Política em `/etc/codex/network-policy.json`: proxy HTTP `http://proxy:8080`; configuração declarada unrestricted; VPN não configurada.
- Serviço do ambiente: running/connected; observação atual da política HTTP: **unknown**. O estado connected do serviço não comprova acesso ao registro a partir dos comandos.
- Diagnóstico limitado a `curl -I --connect-timeout 3 --max-time 8 https://registry.npmjs.org/expo`: saída 7, `Failed to connect to proxy port 8080 ... Could not connect to server`.
- O usuário também relatou EPERM nas tentativas anteriores. O diagnóstico observado aqui confirma a indisponibilidade do proxy no sandbox; não estabelece se a causa final está no serviço proxy ou nas permissões de rede do executor.
- Uma solicitação anterior de rede adicional não concluiu e foi abortada. Nenhuma autorização foi presumida, nenhum proxy foi removido e nenhuma verificação TLS foi desabilitada.
- O workspace não continha arquivos do aplicativo antes desta implementação. Os arquivos de ambiente existentes foram preservados. O projeto foi criado em uma pasta própria.

Não houve novas tentativas de instalar pacotes depois de confirmado o bloqueio. Não há `node_modules` nem lockfile gerado.

## Executado

| Comando | Resultado observado |
|---|---|
| `npm run test:offline` | **42 testes aprovados**, 0 falhas |
| `node scripts/check-source.mjs` | **28 arquivos .ts** aceitos pelo parser do Node; imports locais resolvidos e fronteiras básicas de domínio verificadas |
| `npm run lint` | bloqueado: `eslint: not found` |
| `npm run typecheck` | bloqueado: `tsc: not found` |
| `npm test` | bloqueado: `vitest: not found` |
| `npm run format:check` | bloqueado: `prettier: not found` |
| `npm start -- --offline` | bloqueado: `expo: not found` |

O parser do Node remove tipos; **não verifica tipos TypeScript** e não compila TSX. A inspeção de imports não substitui ESLint. Não existe alegação de que lint, typecheck, Vitest, Zod, JSX ou Expo passaram. O formato final também aguarda Prettier.

## Cobertura executada

- 33 cenários de domínio: distribuição exata em 20 níveis × 100 faces; RNG e níveis inválidos; pesos; preços e desconhecidos; orçamento inclusivo; filtros combinados; raridade manual; modo fiel; fronteiras primárias/secundárias; variantes; vazio sem ressorteio; tabela incompleta/lacunas/sobreposições/referências/raridade/tema; progressão e totais.
- 3 cenários de aplicação/apresentação pura: avaliação do lote, criação do snapshot e conversão/validação do formulário.
- 6 cenários de integração SQLite: migrações idempotentes, reabertura de arquivo, FK com rollback atômico, correção e exclusão, isolamento de campanha, parâmetros SQL, prevenção de duplicação e preservação do histórico ao alterar grupo.

A primeira execução encontrou uma diferença real de representação: as linhas de `node:sqlite` têm protótipo nulo. O repositório passou a construir modelos explícitos para personagens, como já fazia para recompensas. Após a correção, os cenários de persistência passaram. A suíte final inclui os três cenários de aplicação adicionados depois.

## Preparado, mas ainda não executado

- `tests/core.vitest.ts` executa os mesmos 42 cenários em Vitest.
- `tests/importer.vitest.ts` verifica Zod com dados externos inválidos, JSON malformado/excessivo, custo fracionário, campos desconhecidos, referência inválida e persistência apenas de catálogo válido.
- Verificação da compatibilidade do SDK e dependências.
- Formatação Prettier, ESLint, `tsc --noEmit`, export/bundle Expo e testes manuais Android/iOS.

## Desbloqueio

1. O responsável pelo ambiente deve restaurar o acesso do executor ao proxy configurado e confirmar que a política de rede é aplicada. EPERM requer conferir as permissões do sandbox; erro de conexão requer conferir também o serviço proxy.
2. Fazer uma única verificação com timeout curto ao registro, sem imprimir credenciais. Se continuar falhando, corrigir a configuração antes de repetir npm.
3. Executar `npm install` com cache gravável, por exemplo `npm install --cache /tmp/dm-companion-npm-cache` se o cache padrão não puder ser escrito.
4. Executar `npx expo install --check` e `npx expo-doctor`; alinhar versões se necessário. Preservar o lockfile gerado.
5. Executar `npm run format`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run format:check`. Corrigir erros concretos antes de seguir.
6. Iniciar o aplicativo e verificar no celular: criação/edição de campanha, dois modos de sorteio, valor desconhecido, importação local, registro em lote, correção/exclusão e persistência após fechar/reabrir.

O MVP permanece **implementado em fontes e parcialmente validado**, com conclusão bloqueada pela instalação e validação nativa.

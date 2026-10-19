# DM Companion

MVP mobile offline, em português brasileiro, para preparar e registrar tesouros de campanhas de D&D. React Native, Expo Router, TypeScript strict e SQLite. Sem autenticação, backend ou serviços pagos.

**Estado real em 19/10/2026:** fontes implementadas; instalação de dependências bloqueada pela conectividade do ambiente. O aplicativo ainda **não foi iniciado ou validado em celular**. Há 95 testes de domínio, aplicação, sessão, formulários e SQLite executados com Node 24 e aprovados. A auditoria ampliou a suíte original de 42 cenários sem adicionar funcionalidades. Veja [AUDIT_REPORT.md](AUDIT_REPORT.md). Vitest, importador Zod em execução, tsc, ESLint, Prettier e bundling Expo continuam pendentes. Veja [VALIDATION.md](VALIDATION.md).

## Executar sem dependências (verificações disponíveis)

Requer Node **24.19 ou posterior na linha 24** para TypeScript nativo e `node:sqlite`.

```sh
cd /workspace/dm-companion
npm run test:offline
node scripts/check-source.mjs
```

Os testes offline usam os mesmos cenários centrais preparados para Vitest. SQLite é real, com teste de fechamento/reabertura de arquivo. O adaptador `expo-sqlite` no dispositivo ainda precisa de validação. O teste offline não carrega Zod nem React Native.

## Instalar quando a rede estiver disponível

```sh
npm install
npx expo install --check
npx expo-doctor
npm run format
npm run lint
npm run typecheck
npm test
npm run format:check
```

A configuração usa a linha estável Expo SDK 54 / React 19.1 / RN 0.81.5. A resolução efetiva dos patches e peers **ainda não foi verificada** no registro. `expo install --check` e `expo-doctor` devem confirmar a compatibilidade. Caso solicitem alinhamento, executar `npx expo install --fix`, revisar as alterações e repetir as verificações. Não há `package-lock.json` porque nenhuma instalação terminou; não foi fabricado um lockfile. Após instalar e validar, manter o lockfile gerado no controle de versão e usar `npm ci` nas instalações seguintes.

## Executar no celular

1. Instale as dependências e finalize os checks acima.
2. Execute `npm start` (ou `npm start -- --offline` se as dependências já estiverem instaladas e não quiser consultas de rede).
3. Conecte celular e computador à mesma rede. Abra o QR code com uma versão do Expo Go compatível com o **SDK 54**. No Android, consulte `expo.dev/go` para a versão compatível; no iOS físico, o Expo Go atual pode exigir uma atualização coordenada do SDK. Alternativa: um development build compatível.
4. Emulador Android: `npm run android`. Simulador iOS em macOS: `npm run ios`.
5. Crie uma campanha, configure nível e nomes do grupo, sorteie tesouros e registre as concessões. Reinicie o aplicativo para confirmar a persistência no dispositivo.

A execução do bundle requer Metro durante desenvolvimento; o aplicativo nativo empacotado e seus dados locais funcionam offline. Nenhum build de produção foi gerado aqui. O alvo validável deste MVP é **Android/iOS**; web não tem suporte garantido à transação exclusiva usada pelo SQLite.

## Fluxos implementados nas fontes

- Início com campanha ativa, acesso ao grupo, gerador e histórico.
- Criação e seleção de campanhas; edição de nome, nível e personagens.
- Raridade automática pela matriz de nível ou escolha manual livre.
- Quatro temas, nove categorias, valor máximo por item e quantidade de resultados.
- Rolagem fiel ao catálogo ou personalização com preservação dos pesos conjuntos.
- Resultado com valor, variante, fonte, alertas e avaliação quantitativa do lote.
- Concessão individual ou em lote, totais por raridade e histórico editável/excluível.
- Importação local de JSON validado e persistido em catálogo separado.
- Modos claro/escuro do sistema, contraste, fontes do sistema e controles rotulados.

## Estrutura

```text
src/
  app/                         # somente rotas e composição de navegação
  application/                 # coordenação de sessão sem React
  bootstrap/                   # composição de dependências de produção
  database/                    # contrato SQL, adaptador Expo e migrações
  modules/
    campaigns/
      domain/                  # Campaign, Party, Character
      application/             # validação e operação de campanhas
      infrastructure/          # repositório SQLite
      presentation/            # campanhas e configuração do grupo
    treasure/
      domain/                  # modelos, regras, economia, tabelas, sorteio, balanceamento
      application/             # geração para campanha e concessões
      infrastructure/          # importador Zod, catálogos e repositórios
        data/                  # demonstração original, não catálogo oficial
      presentation/            # gerador, resultado e histórico
  shared/                      # adaptador React, UI, regras comuns e Result
scripts/                       # checagem offline de fontes
examples/                      # catálogo de exemplo importável
tests/                         # cenários compartilhados, Vitest, Node e SQLite
```

## Conteúdo e importação

O catálogo inicial possui **45 itens fictícios, 20 tabelas demonstrativas e 5 resoluções**. Os quatro temas compartilham identidades e distribuições apenas para demonstrar o motor. Não é um catálogo oficial ou completo de D&D. Não contém descrições do Livro do Mestre. Os pergaminhos demonstrativos não têm custo de inscrição informado: o valor é desconhecido.

Para adicionar dados, siga [DATA_FORMAT.md](DATA_FORMAT.md). O seletor de arquivos está no gerador. Use somente conteúdo que você possa utilizar; os metadados de fonte/licença são preservados e não certificam autorização. O código suporta identificação de SRD 5.2.1, original e privado, mas **não inclui um pacote SRD**. As descrições originais do JSON demonstrativo e do exemplo são disponibilizadas sob CC0-1.0; não representam conteúdo oficial.

Documentação: [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [DATA_FORMAT.md](DATA_FORMAT.md), [DECISIONS.md](DECISIONS.md).

## Limitações e próximos passos

- Resolver acesso ao proxy/registro npm e instalar dependências antes de declarar o MVP concluído.
- Executar Vitest (inclui importador Zod), typecheck, lint, formatação e export/bundle Expo; corrigir eventuais falhas identificadas.
- Fazer teste manual Android/iOS: importação, leitor de tela, teclado, registro, edição, exclusão e reinício com histórico salvo.
- Catálogo demonstrativo não define efeitos jogáveis. Inserir dados autorizados é uma etapa editorial separada.
- Não há exportação/backup; dados ficam no sandbox do aplicativo. Desinstalar ou limpar dados do app elimina os registros locais.
- Campanha ativa e sorteio ainda não concedido ficam em memória e são reiniciados ao abrir o aplicativo; campanhas, grupo, catálogos importados e concessões ficam no SQLite.
- Histórico é listado integralmente; paginação pode ser adicionada quando houver necessidade comprovada.
- Não há módulos de encontros, NPCs, eventos ou autenticação.

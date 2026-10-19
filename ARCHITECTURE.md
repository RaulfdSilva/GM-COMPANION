# Arquitetura

## Fronteiras e responsabilidades

A organização é modular, inspirada em Clean Architecture sem framework interno de geradores.

```text
Expo Router → telas/hooks → casos de uso → domínio
                         ↘ contratos de repositórios
SQLite/Expo/Zod → infraestrutura implementando contratos
```

O domínio importa seus modelos, `Result` e utilitários puros de nível/data compartilhados. Não depende de React, Expo, Zod ou banco. `generateTreasure` recebe catálogo, configuração e dependências injetadas (`random`, `id`, `now`), sendo executável em Node sem instalar dependências. A validação semântica das tabelas também é independente.

A aplicação liga o sorteio a uma campanha e prepara avaliações para o lote; não grava automaticamente os resultados. O serviço de concessões cria snapshots e valida registros. Campanhas possuem repositório focado em listar e salvar; recompensas possuem listar, inserir lote, corrigir e excluir.

A infraestrutura valida JSON desconhecido com Zod, depois aplica a validação semântica de tabelas. Implementa os repositórios usando o contrato mínimo `AppDatabase`. `expo-database.ts` adapta Expo SQLite; os testes usam SQLite real do Node. O contrato de transação permite que produção e testes executem as mesmas migrações e consultas.

A apresentação contém componentes React Native e modelos puros de formulário/formatos monetários. `application/app-controller.ts` coordena sessão, erros e chamadas aos casos de uso sem React, Expo ou repositórios concretos. O adaptador React em `shared/app-context.tsx` apenas assina snapshots via `useSyncExternalStore` e expõe ações às telas. `bootstrap/open-app-services.ts` compõe SQLite, importador e catálogo demonstrativo. Há bloqueio síncrono de operações concorrentes, controle de ciclo de vida e fechamento de conexões. Sorteios e avaliações ficam na memória; recompensas e configurações mutáveis são persistentes.

## Banco

- `campaigns`: nome, nível atual e data de criação.
- `characters`: personagens com FK para campanha.
- `treasure_awards`: snapshot do item e variante concedidos, valor conhecido ou NULL, raridade, nível na concessão, data e observações.
- `imported_catalogs`: JSON validado, nome e data de importação; isolado do catálogo estático.

O histórico não tem FK para o catálogo: editar/importar um catálogo não deve reescrever o passado. A campanha é a dona do registro, com FK e índice por campanha/data. `NULL` monetário representa desconhecido; zero é um valor conhecido.

Migrações são incrementais pelo `PRAGMA user_version` dentro de transação. A conexão habilita chaves estrangeiras e WAL. Uma versão de banco mais nova impede a abertura para evitar downgrade destrutivo. Não se apagam tabelas nem se reinicializa o banco ao atualizar o aplicativo. Consultas com entradas do usuário são parametrizadas; a versão da migração interpolada é constante do código.

Salvar campanha e substituir personagens é atômico. Conceder vários itens é atômico. O adaptador compartilhado `database/sqlite-database.ts` abre uma conexão própria por transação, habilita `foreign_keys` e `busy_timeout` antes de `BEGIN IMMEDIATE`, confirma/reverte e fecha a conexão. Uma consulta pela conexão principal permanece fora do lote e não vê dados sem commit. Expo fornece conexões com `useNewConnection: true`; Node testa o mesmo adaptador sobre SQLite real em arquivo. O código nativo de abertura/fechamento ainda exige validação em Android/iOS. Não se promete suporte web a esse fluxo.

## Testabilidade e evolução

Os cenários centrais são compartilhados entre Vitest e `node:test`; os testes de importação dependem de Zod e rodam somente em Vitest. Testes de persistência usam arquivos temporários e conexões fechadas, não mocks de SQL.

Novas tabelas entram por dados; o motor não conhece nomes de itens. Resoluções secundárias limitam-se a folhas de item/variante, evitando grafos recursivos e ciclos desnecessários no MVP. A soma dos pesos considera a probabilidade da segunda rolagem.

Não foram criados módulos vazios para funcionalidades futuras. Um futuro módulo pode ter suas próprias camadas e compartilhar o contrato de erros/banco quando existir um caso de uso concreto.

## Consistência da sessão após gravações

Uma gravação confirmada permanece confirmada mesmo se a consulta posterior falhar. O controlador mantém o snapshot conhecido, informa a falha de recarga preservando o tipo de erro e marca o histórico como indisponível. Totais não são apresentados como completos e novas avaliações recebem `history: null`, produzindo dados insuficientes. Selecionar a campanha novamente recarrega os dados. Correções/exclusões de outra campanha são rejeitadas antes de chamar o repositório.

O contrato `CatalogRepository` e o tipo `StoredCatalog` pertencem à aplicação; o controlador não depende de tipos inferidos de infraestrutura. Campanhas usam a regra compartilhada de nível e não importam a matriz de tesouros. Parsing/locale monetário pertencem à apresentação; o domínio só recebe/retorna cobre inteiro. O verificador offline inspeciona dependências estáticas e ciclos, mas não substitui resolução de módulos, typecheck nem bundling.

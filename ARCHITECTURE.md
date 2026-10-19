# Arquitetura

## Fronteiras e responsabilidades

A organização é modular, inspirada em Clean Architecture sem framework interno de geradores.

```text
Expo Router → telas/hooks → casos de uso → domínio
                         ↘ contratos de repositórios
SQLite/Expo/Zod → infraestrutura implementando contratos
```

O domínio importa apenas seus modelos e `Result`. Não depende de React, Expo, Zod ou banco. `generateTreasure` recebe catálogo, configuração e dependências injetadas (`random`, `id`, `now`), sendo executável em Node sem instalar dependências. A validação semântica das tabelas também é independente.

A aplicação liga o sorteio a uma campanha e prepara avaliações para o lote; não grava automaticamente os resultados. O serviço de concessões cria snapshots e valida registros. Campanhas possuem repositório focado em listar e salvar; recompensas possuem listar, inserir lote, corrigir e excluir.

A infraestrutura valida JSON desconhecido com Zod, depois aplica a validação semântica de tabelas. Implementa os repositórios usando o contrato mínimo `AppDatabase`. `expo-database.ts` adapta Expo SQLite; os testes usam SQLite real do Node. O contrato de transação permite que produção e testes executem as mesmas migrações e consultas.

A apresentação contém componentes React Native e um modelo puro de formulário. `shared/app-context.tsx` é a composição do aplicativo e coordena estado de sessão, erros e chamadas aos casos de uso. Há um bloqueio de operação de escrita para evitar cliques simultâneos. Sorteios e avaliações ficam na memória; recompensas e configurações mutáveis são persistentes.

## Banco

- `campaigns`: nome, nível atual e data de criação.
- `characters`: personagens com FK para campanha.
- `treasure_awards`: snapshot do item e variante concedidos, valor conhecido ou NULL, raridade, nível na concessão, data e observações.
- `imported_catalogs`: JSON validado, nome e data de importação; isolado do catálogo estático.

O histórico não tem FK para o catálogo: editar/importar um catálogo não deve reescrever o passado. A campanha é a dona do registro, com FK e índice por campanha/data. `NULL` monetário representa desconhecido; zero é um valor conhecido.

Migrações são incrementais pelo `PRAGMA user_version` dentro de transação. A conexão habilita chaves estrangeiras e WAL. Uma versão de banco mais nova impede a abertura para evitar downgrade destrutivo. Não se apagam tabelas nem se reinicializa o banco ao atualizar o aplicativo. Consultas com entradas do usuário são parametrizadas; a versão da migração interpolada é constante do código.

Salvar campanha e substituir personagens é atômico. Conceder vários itens é atômico. Expo usa transação exclusiva para impedir que consultas concorrentes entrem no lote. Não se promete suporte web a esse método.

## Testabilidade e evolução

Os cenários centrais são compartilhados entre Vitest e `node:test`; os testes de importação dependem de Zod e rodam somente em Vitest. Testes de persistência usam arquivos temporários e conexões fechadas, não mocks de SQL.

Novas tabelas entram por dados; o motor não conhece nomes de itens. Resoluções secundárias limitam-se a folhas de item/variante, evitando grafos recursivos e ciclos desnecessários no MVP. A soma dos pesos considera a probabilidade da segunda rolagem.

Não foram criados módulos vazios para funcionalidades futuras. Um futuro módulo pode ter suas próprias camadas e compartilhar o contrato de erros/banco quando existir um caso de uso concreto.

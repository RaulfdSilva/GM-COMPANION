# Decisões

## 001 — Módulos e funções, sem framework genérico

Separar campanhas e tesouros com domínio, aplicação, infraestrutura e apresentação. Funções puras e tipos readonly atendem ao motor; interfaces existem apenas em fronteiras úteis (repositórios e banco). Isso permite testar o motor sem Expo e evita preparar abstrações para módulos ainda inexistentes.

## 002 — Inteiros em cobre e desconhecido explícito

1 PO = 100 unidades mínimas. `MoneyValue` é uma union discriminada: valor conhecido ou motivo de desconhecimento. O histórico guarda NULL quando desconhecido. O valor calculado não é duplicado no catálogo, evitando inconsistência com categoria, consumível, equipamento e variante. O catálogo armazena os insumos; o resultado/histórico armazenam o valor preparado para exibição/snapshot.

## 003 — Preservar pesos após resolver variantes

A personalização opera nas folhas da tabela, usando probabilidade conjunta do intervalo principal e da resolução. Filtrar apenas nomes de itens perderia peso e ignoraria variantes de preço distinto. O modo fiel rola dados reais injetados; o personalizado não inventa um histórico de dados equivalente.

## 004 — Não ressorteiar raridade para contornar filtros

Retornar ausência de resultados após uma raridade sorteada sem elegíveis mantém o significado da matriz automática. Alterar silenciosamente a distribuição seria incorreto. O Mestre pode mudar os filtros ou usar raridade manual.

## 005 — Uma tabela por tema/raridade em cada catálogo

O MVP evita escolher arbitrariamente entre múltiplas tabelas concorrentes. Catálogos importados são selecionáveis e isolados. Expansão para múltiplas tabelas da mesma combinação pode adicionar escolha explícita de tabela, quando necessária, sem alterar o motor de pesos.

## 006 — Catálogo original e sem preços fictícios para pergaminhos

O catálogo demonstra todas as categorias e combinações de tema/raridade, mas seus itens, pesos e efeitos não são oficiais. Os mesmos IDs aparecem nos vários temas. Valores-base identificados como demonstrativos são fictícios. Custos de inscrição não foram presumidos: os pergaminhos têm valor desconhecido. Há suporte a metadados SRD 5.2.1 sem incluir textos ou tabelas protegidas.

## 007 — Histórico independente do catálogo

Snapshots preservam a concessão mesmo se catálogos mudarem. Não existe FK para item estático; existe FK obrigatória para campanha. Os resultados sorteados recebem UUID, usado também no registro de concessão, impedindo que o mesmo resultado seja salvo duas vezes por engano. Resultados não concedidos não precisam sobreviver a reinícios no MVP.

## 008 — SQLite com migrações incrementais e transações exclusivas

Usar `user_version` e transações em vez de reinicializar o banco. A integração Node usa SQLite real pelo mesmo contrato, com reabertura de arquivo, FK e rollback. Esse teste não prova o adaptador Expo, que exige validação nativa. Android/iOS são o alvo; não se adicionou um segundo armazenamento para web.

## 009 — Comparação quantitativa explicável

A referência vale para a faixa inteira. Nenhum multiplicador por personagem é inventado. O caso de uso avalia a quantidade total da raridade no lote proposto, evitando dizer que sete recompensas cabem apenas porque cada uma foi comparada isoladamente com histórico vazio. As regras, a origem da referência e as limitações aparecem no resultado.

## 010 — Desenvolvimento offline durante bloqueio npm

O registro não pôde ser alcançado pelo proxy configurado. Após diagnóstico curto, não se repetiram instalações nem se desabilitou proxy/TLS. Foram criados fontes e testes e utilizados os recursos locais do Node 24. O modo de teste sem isolamento evita depender de subprocessos do test runner neste sandbox.

As versões declaradas pertencem à linha conhecida do Expo SDK 54. Não houve consulta conclusiva ao registro, instalação, lockfile ou execução do Expo. Não se afirma compatibilidade final de patches/peers antes de `expo install --check` e `expo-doctor` em ambiente conectado.

# Regras de negócio

## Proveniência e caráter das referências

As matrizes e referências econômicas abaixo são as fornecidas na especificação do projeto, voltadas à revisão 2024 de D&D 5e. Não foi feita verificação editorial independente de cada referência em publicação oficial. Elas não autorizam a reprodução de tabelas ou textos do Livro do Mestre. Os pesos, nomes e descrições do catálogo incluído são originais e demonstrativos.

O aplicativo não apresenta a comparação quantitativa do histórico como regra oficial de equilíbrio. Dois itens da mesma raridade podem ter poderes muito diferentes. Nenhum fator por quantidade de jogadores é inferido.

## Raridade

| Níveis | Comum | Incomum | Raro | Muito raro | Lendário |
| ------ | ----: | ------: | ---: | ---------: | -------: |
| 1–4    |    54 |      37 |    9 |          0 |        0 |
| 5–10   |    30 |      51 |   17 |          2 |        0 |
| 11–16  |    11 |      23 |   36 |         23 |        7 |
| 17–20  |     0 |       0 |   20 |         44 |       36 |

O automático rola um d100 em intervalos cumulativos inclusivos. Valores zero não criam intervalo. O modo manual não consome uma rolagem de raridade e permite qualquer uma das cinco raridades; probabilidade usual zero gera aviso sem bloqueio. Artefatos podem ser descritos/importados, mas não entram nas cinco raridades sorteáveis.

No automático, sorteia-se a raridade antes de filtrar os itens. Se a tabela sorteada não existe ou não tem resultados elegíveis, a operação retorna ausência de resultados; não redistribui raridades nem tenta novamente. Um lote é retornado inteiro ou como erro: não se inventam itens nem se retorna um lote parcial.

## Tabelas, variantes e filtros

Temas: Arcana, Armaments, Implements, Relics. Há no máximo uma tabela por combinação tema/raridade em um catálogo. Cada tabela usa d100. Limites são inteiros inclusivos entre 1 e 100; o peso é `max - min + 1`.

No modo fiel, rola-se d100 e, quando necessário, o dado da resolução adicional, sem filtros de categoria/valor. O nível, tema e raridade selecionam a tabela; não alteram seus pesos internos. A interface deixa explícito que “fiel” se refere ao **catálogo ativo**, que pode ser demonstrativo ou privado.

No personalizado, expandem-se as resoluções em folhas. A folha recebe peso:

```text
faces do intervalo principal × faces da variante / faces do dado secundário
```

Após aplicar filtros ao item/variante resolvido, a escolha usa esses pesos relativos. Exemplos: pesos 10 e 2 permanecem 5:1; uma variante 4/6 e outra 2/6 de uma entrada preservam 2:1. Os cálculos probabilísticos podem usar ponto flutuante; valores monetários não. No personalizado não são exibidas falsas rolagens d100 — mostra-se que houve escolha ponderada condicionada.

É permitido que um item apareça em várias tabelas/intervalos, sem duplicar identidade. Entradas sobrepostas, intervalos repetidos, IDs duplicados, referências inválidas e incoerência de raridade/tema são erros. Uma tabela completa deve cobrir todas as faces exatamente uma vez; uma resolução completa também. Tabela completa não pode depender de resolução incompleta. Uma tabela declarada incompleta pode ser importada para revisão, mas nunca sorteada. Sobreposição continua sendo erro mesmo em tabela incompleta.

Categorias são um checklist com ao menos uma opção. Quantidade é inteira entre 1 e 100 (limite operacional do MVP, não regra de D&D). Nível é inteiro entre 1 e 20. Filtro de valor máximo é **por item**, inclusivo, incluindo equipamento e acréscimos; não representa o total do lote.

## Economia

Todos os valores armazenados e calculados usam cobre inteiro: 1 PO = 100 unidades. A entrada de PO aceita até duas casas decimais, vírgula ou ponto, sem separador de milhares. O parse converte dígitos separadamente para não depender de arredondamento binário.

| Raridade   |     PO |    Cobre |
| ---------- | -----: | -------: |
| Comum      |    100 |    10000 |
| Incomum    |    400 |    40000 |
| Raro       |   4000 |   400000 |
| Muito raro |  40000 |  4000000 |
| Lendário   | 200000 | 20000000 |

```text
referência ajustada + equipamento-base + acréscimo do item + acréscimo da variante
```

A referência é reduzida pela metade em consumíveis, exceto pergaminhos. Pergaminhos exigem custo explícito de inscrição autorizado no catálogo; não se infere esse custo pela raridade nem se aplica novamente o desconto de consumível. Não há tabela de inscrição copiada ou inventada. Os valores-base de armas/armaduras de demonstração são fictícios, claramente nomeados como demonstrativos.

Uma variante com equipamento próprio substitui o equipamento-base do item; `baseEquipment: null` na variante herda o do item. O acréscimo da variante soma ao do item. Artefatos, preço marcado como desconhecido, equipamento sem preço ou custo de inscrição ausente resultam em valor desconhecido. Estouro do inteiro seguro também resulta em desconhecido.

Desconhecido nunca é zero. Com limite de valor, itens desconhecidos são excluídos por padrão. O Mestre pode explicitamente permitir desconhecidos; o resultado avisa que o limite não foi confirmado. Sem orçamento, desconhecidos podem ser sorteados, sempre identificados. Não se usam custos de fabricação como preços de mercado.

## Avaliação de progressão

| Níveis | Comum | Incomum | Raro | Muito raro | Lendário |
| ------ | ----: | ------: | ---: | ---------: | -------: |
| 1–4    |     6 |       4 |    1 |          0 |        0 |
| 5–10   |    10 |      17 |    6 |          1 |        0 |
| 11–16  |     3 |       7 |   11 |          7 |        2 |
| 17–20  |     0 |       0 |    5 |         11 |        9 |

São referências acumuladas para a faixa inteira, não metas de cada nível. O motor conta concessões da mesma raridade com nível registrado dentro da faixa atual. Recompensas de faixas anteriores permanecem no histórico mas não são adicionadas à contagem da faixa atual.

A avaliação soma à contagem histórica a quantidade de itens dessa raridade no lote proposto. Referência zero → `unusual`; total acima da referência → `aboveReference`; demais → `withinReference`. Nível inválido, histórico não fornecido ou artefato → `insufficientData`. Histórico vazio é informação válida, diferente de histórico desconhecido. O resultado inclui explicação, regras usadas, avisos, contagem, referência, faltas de dados e quantidade contextual de personagens.

Essa classificação é uma adaptação transparente do aplicativo, não um bloqueio nem uma equivalência de poder. A avaliação exibida no resultado é do momento do sorteio; futuras gerações usam o histórico atualizado.

## Histórico

Sorteio não é concessão. Cada resultado concedido cria um registro com uma unidade de item, campanha, nome/raridade/variante e valor como snapshot, nível escolhido no sorteio, data e observações. A concessão do mesmo resultado tem ID estável para impedir duplicação por cliques repetidos. Concessões múltiplas são atômicas.

Correções alteram o snapshot histórico sem editar o catálogo. Exclusões removem a unidade da contagem; a interface solicita confirmação específica. Corrigir o grupo não modifica retroativamente níveis das concessões anteriores.

## Garantias reforçadas pela auditoria

- Cada parcela monetária deve ser um inteiro seguro não negativo; parcelas inválidas não podem se cancelar para formar um total aparentemente válido. Isso é verificado também pelo núcleo independente, além do Zod.
- A exibição e edição de PO preservam o resto em cobre, inclusive no limite de `Number.MAX_SAFE_INTEGER`. Locale é aplicado apenas à parte inteira.
- Modos de geração, IDs e data do resultado são validados; um identificador vazio/repetido invalida o lote. Uma resolução com número de faces inválido não é percorrida.
- O caso de uso de geração filtra o histórico pela campanha. Histórico indisponível não equivale a zero recompensas. Níveis inválidos no histórico ou totais inseguros produzem dados insuficientes.
- Datas de concessão devem ser ISO 8601 com horário e fuso explícito. Datas inexistentes e formatos ambíguos são recusados; novas gravações são normalizadas para UTC e o histórico é ordenado pelo instante real. Registros antigos inválidos são preservados e sinalizados, sem conversão presumida.
- A data de criação da campanha permanece imutável em atualizações, e o repositório retorna o valor efetivamente persistido. A edição dos nomes do grupo preserva IDs por nome/posição disponível, em vez de reassociar todos apenas pelo índice.
- O limite de importação é de 2.000.000 bytes UTF-8, não caracteres. Nomes vazios após trim são inválidos. Nomes de itens de até 1000 caracteres aceitos no catálogo também podem ser registrados no histórico.

As matrizes, valores de referência, pesos demonstrativos e liberdade de decisão do Mestre não foram alterados.

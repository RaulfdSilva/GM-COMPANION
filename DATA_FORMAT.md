# Formato de dados

## Importação

No gerador, use **Importar catálogo local (.json)**. O seletor copia o arquivo para o cache; o aplicativo valida o texto, a estrutura Zod e a integridade semântica antes de persistir qualquer dado. Cancelar o seletor não é erro. Arquivos têm limite de 2.000.000 bytes UTF-8 (2 MB); até 5000 itens, 100 tabelas e 500 resoluções por catálogo. São limites operacionais de proteção do MVP.

O importador público recebe `unknown` (`importCatalog`) ou texto (`importCatalogText`) e devolve `Result<TreasureCatalog>`. JSON inválido, campos desconhecidos e estrutura inválida geram `validation`; não há fallback para catálogo fictício. A persistência só ocorre após validação. O catálogo importado fica isolado do demonstrativo; selecione-o explicitamente. A fonte real dos dados é a declarada no arquivo, mesmo quando seu armazenamento é privado/local.

Arquivo completo para começar: [examples/custom-catalog.json](examples/custom-catalog.json). É uma versão menor da demonstração com apenas Arcana/comum; outras combinações retornam ausência de tabela. O catálogo completo de demonstração fica em `src/modules/treasure/infrastructure/data/demo-catalog.json`.

## Raiz

```json
{
  "schemaVersion": 1,
  "items": [],
  "tables": [],
  "resolutions": []
}
```

O exemplo acima mostra a estrutura; `items` e `tables` precisam ter pelo menos uma entrada. Campos opcionais do conceito são representados explicitamente por `null`, arrays vazios ou objetos vazios. Campos extras são rejeitados para revelar erros de digitação. Nomes, rótulos e campos de identificação são aparados; nomes/IDs vazios são recusados. Nomes de item têm até 1000 caracteres, compatíveis com o registro de concessões.

## Item

```json
{
  "id": "original-lampada-da-bruma",
  "name": "Lâmpada da Bruma",
  "rarity": "common",
  "category": "Wondrous Item",
  "themes": ["Arcana", "Relics"],
  "consumable": false,
  "attunement": false,
  "pricing": { "kind": "reference" },
  "baseEquipment": null,
  "additionalCostCopper": 0,
  "source": {
    "name": "Minha mesa",
    "license": "Uso privado autorizado",
    "kind": "private",
    "attribution": "Conteúdo original do Mestre"
  },
  "description": "Um objeto fictício da campanha.",
  "variantMetadata": {}
}
```

- IDs são estáveis e únicos dentro do catálogo. Use um namespace no ID para identificar sua origem. Reutilize o mesmo ID em todas as tabelas que apontarem ao mesmo item.
- Raridades: `common`, `uncommon`, `rare`, `veryRare`, `legendary`, `artifact`. Artefato não pertence às matrizes das tabelas sorteáveis.
- Categorias: `Armor`, `Potion`, `Ring`, `Rod`, `Scroll`, `Staff`, `Wand`, `Weapon`, `Wondrous Item`.
- Temas: `Arcana`, `Armaments`, `Implements`, `Relics`.
- `pricing`: `{ "kind": "reference" }`, `{ "kind": "scroll", "inscriptionCopper": 5000 }` (ou `null` se desconhecido), ou `{ "kind": "unknown", "reason": "Motivo" }`. Custo de inscrição é exclusivo de categoria Scroll.
- `baseEquipment`: `null` ou `{ "name": "Espada", "costCopper": 1500 }`; `costCopper: null` indica equipamento de valor desconhecido.
- Todas as moedas são inteiros não negativos em cobre, até `Number.MAX_SAFE_INTEGER`. Nenhum campo monetário aceita fração.
- `variantMetadata` contém pares texto/texto informativos. Custos calculáveis pertencem aos campos explícitos de variante, não a esse mapa.

## Tabela

```json
{
  "id": "minha-arcana-common",
  "name": "Arcana comum da minha mesa",
  "rarity": "common",
  "theme": "Arcana",
  "complete": true,
  "source": {
    "name": "Minha mesa",
    "license": "Uso privado autorizado",
    "kind": "private",
    "attribution": ""
  },
  "entries": [
    {
      "tableId": "minha-arcana-common",
      "min": 1,
      "max": 100,
      "target": { "kind": "item", "itemId": "original-lampada-da-bruma", "variant": null }
    }
  ]
}
```

Os intervalos são inclusivos. Tabelas são d100; uma tabela `complete: true` deve cobrir 1–100 exatamente uma vez. Apenas uma tabela por tema/raridade é permitida por catálogo. O item deve ter a raridade e o tema declarados na tabela. Intervalos diferentes podem referenciar o mesmo item legitimamente; os pesos são preservados. Repetir intervalos/IDs ou sobrepor faces é inválido.

## Resolução secundária

Na entrada principal, use `target: { "kind": "resolution", "resolutionId": "acabamento" }`. Na raiz `resolutions`, acrescente:

```json
{
  "id": "acabamento",
  "name": "Acabamento da lâmpada",
  "sides": 6,
  "complete": true,
  "entries": [
    {
      "min": 1,
      "max": 4,
      "target": {
        "kind": "item",
        "itemId": "original-lampada-da-bruma",
        "variant": { "label": "Cobre", "baseEquipment": null, "additionalCostCopper": 100 }
      }
    },
    {
      "min": 5,
      "max": 6,
      "target": {
        "kind": "item",
        "itemId": "original-lampada-da-bruma",
        "variant": { "label": "Prata", "baseEquipment": null, "additionalCostCopper": 1000 }
      }
    }
  ]
}
```

Dado secundário tem entre 1 e 100 faces. Uma resolução completa cobre todas as faces. Uma resolução aponta apenas para itens/variantes, não para outras resoluções. Para escolha de magia, crie folhas com IDs de itens ou rótulos de variantes autorizadas de magia. Para equipamento, informe `baseEquipment` na variante; quando não nulo, ele substitui o do item. `null` herda o equipamento do item. O custo adicional soma, sem substituir o acréscimo do item.

## Acrescentar dados e fontes

1. Inclua o item uma única vez em `items`, com fonte, licença e descrição autorizada.
2. Aponte os intervalos apropriados para seu ID; mantenha raridade/temas coerentes.
3. Complete todos os intervalos antes de marcar a tabela completa.
4. Importe o arquivo. Importação aceita tabelas incompletas identificadas, mas o motor recusa utilizá-las.
5. Teste fronteiras e pesos. Para alterar o catálogo embutido, execute também a suíte de testes e revise expectativas editoriais do exemplo.

`source.kind` separa `original`, `srd` e `private`. Para SRD 5.2.1 autorizado, informe o documento, licença CC-BY-4.0 e atribuição exigida pela fonte, incluindo alterações quando aplicável. O importador preserva os metadados; não verifica automaticamente a titularidade de textos nem transforma conteúdo privado em conteúdo redistribuível. Não inclua material do Livro do Mestre sem autorização aplicável.

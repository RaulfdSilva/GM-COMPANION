# Versionamento e transferência pelo celular

## Estado verificado em 19/10/2026

Antes da preparação, `/workspace/dm-companion` e `/workspace` não eram repositórios Git válidos. Não havia commits, branch ou remotes do projeto. O diretório reservado `/workspace/.git` do ambiente foi preservado.

Foi criado um repositório **local** em `/workspace/dm-companion`, na branch `mvp/importacao-inicial`, com o remote:

```text
origin  https://github.com/RaulfdSilva/GM-COMPANION.git
```

A identidade Git já configurada no ambiente é utilizada sem ser alterada. O snapshot inicial é um commit local, não uma cópia do histórico oficial. `push.default=nothing` faz `git push` sem refspec falhar, reduzindo o risco de um envio acidental. Isso não substitui a confirmação do responsável pelo projeto.

O GitHub CLI informou autenticação configurada. A consulta de refs por `git ls-remote` e a consulta de metadados pela API não conseguiram alcançar o GitHub pelo proxy. O erro observado foi `Failed to connect to proxy port 8080`. Não foi possível verificar commits, branch padrão, arquivos existentes ou permissões de escrita no repositório oficial.

**Nenhum push, alteração de arquivo remoto ou force push foi executado.** Não é seguro decidir como integrar o snapshot antes de ler o repositório oficial. Não foi feita instalação de dependências.

## Preservação

- Uma cópia integral dos 68 arquivos anteriores à preparação foi criada em `/workspace/backups/dm-companion-before-git-20261019T145847Z.zip`, com manifesto SHA-256.
- O único arquivo preexistente alterado durante esta preparação foi `.gitignore`; seu conteúdo original permanece no backup. Código, exemplos e documentação preexistentes são preservados byte a byte.
- `.gitignore` exclui dependências, caches, builds, diretórios nativos gerados do Expo, bancos locais, chaves, tokens/configuração local e arquivos `.env` reais. Templates `.env.example` são permitidos e devem conter apenas exemplos sem segredos.
- `package-lock.json` não é ignorado. Deve ser versionado após uma instalação válida. `expo-env.d.ts`, que já contém a referência estática de tipos do projeto, permanece versionado.
- Foi feita busca por padrões conhecidos de credenciais sem exibir os valores. Isso não substitui revisão dos arquivos antes de publicar, especialmente se conteúdo privado for adicionado no futuro.

## Retomar pelo ambiente, quando o GitHub estiver acessível

1. Confirmar a autenticação e fazer uma consulta limitada de refs ao repositório oficial.
2. Ler a branch padrão, commits e arquivos remotos antes de escolher a estratégia.
3. Se houver histórico remoto, clonar o oficial em **outro diretório**, criar uma branch a partir da branch padrão e integrar as fontes nela. Preservar ambas as versões dos arquivos com nomes coincidentes e resolver diferenças explicitamente. O snapshot local independente permanece disponível para recuperação.
4. Se o remoto estiver comprovadamente vazio, preparar a publicação inicial na branch acordada.
5. Mostrar a comparação de arquivos, commits e branch de destino ao responsável e obter confirmação **antes do push**. Usar envio normal para branch nova, seguido de pull request quando houver histórico. Nunca force push.

Não executar `git reset --hard`, `git clean`, substituir a pasta `.git` oficial ou usar `--allow-unrelated-histories` como atalho de importação.

## Transferir pelo celular usando o navegador

O pacote `/workspace/dm-companion-transfer.zip` contém todas as fontes preparadas e os arquivos ocultos necessários, sem `.git`, credenciais ou dependências. O snapshot anterior também está disponível separadamente. O ZIP de transferência inclui `SHA256SUMS` para conferir a integridade de cada arquivo.

1. Baixe o ZIP pelo link fornecido na conversa e mantenha uma cópia no armazenamento do celular.
2. Abra `github.com/RaulfdSilva/GM-COMPANION` no navegador. Se **Codespaces** estiver disponível na conta, abra um Codespace do próprio repositório oficial a partir da branch padrão. Isso preserva os commits existentes. Se o repositório estiver vazio e não oferecer Codespaces, primeiro crie pelo site um README inicial com o conteúdo escolhido por você, para estabelecer a branch padrão.
3. No editor do Codespace (o modo desktop do navegador pode facilitar), crie uma branch nova a partir da branch padrão, por exemplo `mvp/importacao-mobile-20261019`. Confira `git status` antes; se houver alterações preexistentes, salve-as antes de importar.
4. Use **Upload** no Explorer para enviar o ZIP inteiro. Mova-o para `/tmp` antes de preparar os arquivos para commit:

   ```sh
   mv dm-companion-transfer.zip /tmp/dm-companion-transfer.zip
   mkdir -p /tmp/gm-companion-import
   python3 -m zipfile -e /tmp/dm-companion-transfer.zip /tmp/gm-companion-import
   cd /tmp/gm-companion-import
   sha256sum -c SHA256SUMS
   ```

5. Volte ao diretório clonado do repositório oficial, cuja localização aparece no Explorer. Copie apenas arquivos ausentes:

   ```sh
   cp -an /tmp/gm-companion-import/dm-companion/. .
   git status --short
   ```

   `cp -an` não sobrescreve arquivos existentes. Para cada caminho que já existia, compare o arquivo oficial com a versão extraída e faça a integração na branch nova. Ambas as versões continuam disponíveis: uma no clone e outra em `/tmp/gm-companion-import/dm-companion`, além do ZIP no celular. Revise especialmente README, `.gitignore`, `package.json`, configurações e arquivos de `src/`. Não substitua esses arquivos automaticamente.

6. Revise no painel Source Control as alterações e os arquivos ignorados. Só então faça um commit na branch nova, publique essa branch e abra um pull request para a branch padrão. O histórico oficial permanece como base. Não use force push e não inclua o ZIP, bancos, `.env` reais, chaves ou tokens.

Esses passos não exigem instalar dependências do aplicativo. Validar Expo e testes completos é uma etapa posterior, já descrita no README.

**Enviar o ZIP como um único arquivo ao repositório pelo site não importa suas pastas como código.** Para uma transferência completa, extraia e revise os arquivos mantendo caminhos e arquivos ocultos, como no procedimento acima. Se Codespaces não estiver disponível, use um cliente Git/terminal já disponível no celular para clonar o oficial e repetir o fluxo de branch nova, extração, cópia sem sobrescrita e revisão.

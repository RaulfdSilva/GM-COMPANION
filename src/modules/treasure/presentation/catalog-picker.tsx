import { useRef, useState } from 'react';
import { MAX_CATALOG_BYTES } from '../application/catalog-repository';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useApp } from '../../../shared/app-context';
import { errorMessage } from '../../../shared/types/result';
import { Button, Card, Choices, Copy, Heading } from '../../../shared/components/ui';
export function CatalogPicker() {
  const app = useApp();
  const [picking, setPicking] = useState(false);
  const readingFile = useRef(false);
  async function pick() {
    if (readingFile.current || app.busy) return;
    readingFile.current = true;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        app.reportError({ kind: 'validation', message: 'Nenhum arquivo selecionado.' });
        return;
      }
      const file = new File(asset.uri);
      if (Math.max(asset.size ?? 0, file.size) > MAX_CATALOG_BYTES) {
        app.reportError({ kind: 'validation', message: 'Selecione um JSON com até 2 MB.' });
        return;
      }
      await app.importText(await file.text(), asset.name);
    } catch (cause) {
      app.reportError({
        kind: 'unavailable',
        message: 'Não foi possível ler o arquivo local.',
        details: [errorMessage(cause)],
      });
    } finally {
      readingFile.current = false;
      setPicking(false);
    }
  }
  return (
    <Card>
      <Heading>Catálogo de itens</Heading>
      <Choices
        label="Dados utilizados no sorteio"
        options={app.catalogs.map((catalog) => ({ value: catalog.id, label: catalog.name }))}
        value={app.catalogId}
        onChange={app.chooseCatalog}
        disabled={app.busy || picking}
      />
      <Copy muted>
        Importe um JSON autorizado pelo seletor de arquivos. Cada catálogo permanece separado;
        importar não altera os registros já concedidos.
      </Copy>
      <Button
        title={picking ? 'Lendo arquivo…' : 'Importar catálogo local (.json)'}
        secondary
        disabled={picking || app.busy}
        onPress={() => void pick()}
      />
    </Card>
  );
}

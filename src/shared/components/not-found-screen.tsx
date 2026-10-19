import { Link } from 'expo-router';
import { Copy, Page } from './ui';
export function NotFoundScreen() {
  return (
    <Page title="Página não encontrada">
      <Copy>Este caminho não existe.</Copy>
      <Link href="/">Voltar ao início</Link>
    </Page>
  );
}

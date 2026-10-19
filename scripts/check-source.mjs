import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, error } from 'node:console';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : path;
  }));
  return nested.flat();
}
const files = [...await listFiles(resolve(root, 'src')), ...await listFiles(resolve(root, 'tests'))];
let failed = false;
let parsed = 0;
for (const file of files) {
  if (!/\.tsx?$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  if (/\/domain\//.test(file) && /from ['"](?:react|expo|.*(?:infrastructure|presentation))/.test(content)) {
    error(`Dependência inválida no domínio: ${file}`);
    failed = true;
  }
  if (file.endsWith('.ts')) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--check', file], { encoding: 'utf8' });
    if (result.status !== 0) { error(result.stderr || result.error?.message); failed = true; }
    parsed++;
  }
  for (const match of content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const path = resolve(dirname(file), match[1]);
    const resolved = files.some((candidate) => [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`].includes(candidate));
    if (!resolved) { error(`Import local ausente em ${file}: ${match[1]}`); failed = true; }
  }
}
log(`${parsed} arquivos TypeScript verificados pelo parser do Node; imports locais e dependências do domínio inspecionados.`);
log('Esta checagem NÃO substitui tsc, ESLint nem compilação de TSX/Expo.');
if (failed) process.exitCode = 1;

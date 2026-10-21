import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, error } from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : path;
    }),
  );
  return nested.flat();
}
const files = [
  ...(await listFiles(resolve(root, 'src'))),
  ...(await listFiles(resolve(root, 'tests'))),
];
const graph = new Map();
let failed = false;
let parsed = 0;

for (const file of files) {
  if (!/\.tsx?$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  const normalized = file.split(sep).join('/');
  const innerLayer = /\/(domain|application)\//.test(normalized);
  const edges = [];
  for (const match of content.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?[^;]*?\bfrom\s+['"]([^'"]+)['"]/g,
  )) {
    const specifier = match[1];
    if (innerLayer && /^(react(?:-native)?(?:\/|$)|expo(?:[-/]|$)|zod$)/.test(specifier)) {
      error(`Dependência de plataforma em camada interna: ${file} -> ${specifier}`);
      failed = true;
    }
    if (!specifier.startsWith('.')) continue;
    const path = resolve(dirname(file), specifier);
    const candidates = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`];
    const target = files.find((candidate) => candidates.includes(candidate));
    if (!target) {
      error(`Import local ausente: ${file} -> ${specifier}`);
      failed = true;
      continue;
    }
    const targetPath = target.split(sep).join('/');
    if (innerLayer && /\/(infrastructure|presentation|bootstrap)\//.test(targetPath)) {
      error(`Dependência de camada externa: ${file} -> ${target}`);
      failed = true;
    }
    edges.push(target);
  }
  graph.set(file, edges);
  if (file.endsWith('.ts')) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--check', file], {
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      error(result.stderr || result.error?.message);
      failed = true;
    }
    parsed++;
  }
}

const visited = new Set();
const visiting = new Set();
function checkCycles(file, path = []) {
  if (visiting.has(file)) {
    error(`Ciclo de imports: ${[...path, file].join(' -> ')}`);
    failed = true;
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const target of graph.get(file) ?? []) checkCycles(target, [...path, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) checkCycles(file);
log(
  `${parsed} arquivos .ts verificados pelo parser do Node; imports estáticos locais, camadas e ciclos inspecionados.`,
);
log(
  'Esta checagem não verifica tipos nem compila TSX; resolução npm, ESLint e Expo continuam pendentes.',
);
if (failed) process.exitCode = 1;

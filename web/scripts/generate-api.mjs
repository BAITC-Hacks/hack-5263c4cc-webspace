import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const schema = new URL('../openapi.json', import.meta.url);
const target = new URL('../src/shared/api/schema.d.ts', import.meta.url);
const content = '// Generated from web/openapi.json. Do not edit by hand.\n' + astToString(await openapiTS(schema, {defaultNonNullable: false}));
if (process.argv.includes('--check')) {
  const existing = await readFile(target, 'utf8').catch(() => '');
  if (existing.replaceAll('\r\n', '\n') !== content.replaceAll('\r\n', '\n')) {
    console.error('Type contract drift: run npm run api:generate --prefix web');
    process.exitCode = 1;
  }
} else {
  await mkdir(new URL('../src/shared/api/', import.meta.url), { recursive: true });
  await writeFile(fileURLToPath(target), content, 'utf8');
}

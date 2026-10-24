import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ESLint } from 'eslint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configFile = path.join(root, 'tsconfig.json');
const config = ts.readConfigFile(configFile, ts.sys.readFile);
assert.equal(config.error, undefined, 'Root tsconfig must parse');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
assert.deepEqual(parsed.errors, [], 'Root project configuration must be valid');
assert.ok(parsed.fileNames.some(file => path.resolve(file) === path.join(root, 'src/app/page.tsx')), 'Root entrypoint must remain included');
const nested = path.join(root, 'apps') + path.sep;
assert.ok(parsed.fileNames.every(file => !path.resolve(file).startsWith(nested)), 'Nested apps must not enter the root TypeScript project');
const eslint = new ESLint({ cwd: root });
assert.equal(await eslint.isPathIgnored(path.join(root, 'apps/couple-hub/src/app/api/account/route.ts')), true, 'Root ESLint must not lint the isolated app');
console.log('PASS: root TypeScript and ESLint exclude nested apps; root entrypoint is included.');

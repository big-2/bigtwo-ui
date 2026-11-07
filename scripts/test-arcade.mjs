import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(os.tmpdir(), 'bigtwo-arcade-'));
try {
    const sources = [
        ...['types.ts', 'engine.ts', 'storage.ts'].map(file => path.join(root, 'src/arcade', file)),
        path.join(root, 'src/utils/cardSorting.ts'),
        path.join(root, 'src/utils/moveValidation.ts'),
    ];
    const compiler = path.join(root, 'node_modules/typescript/bin/tsc');
    const compile = spawnSync(process.execPath, [compiler, '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--lib', 'ES2020,DOM', '--rootDir', path.join(root, 'src'), '--outDir', temp, ...sources], { cwd: root, stdio: 'inherit' });
    if (compile.status !== 0) process.exitCode = compile.status ?? 1;
    else {
        const run = spawnSync(process.execPath, ['--test', path.join(root, 'tests/arcade.test.mjs')], {
            cwd: root,
            stdio: 'inherit',
            env: { ...process.env, ARCADE_BUILD_DIR: temp },
        });
        process.exitCode = run.status ?? 1;
    }
} finally {
    await rm(temp, { recursive: true, force: true });
}

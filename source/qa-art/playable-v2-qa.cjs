const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Compatibility entrypoint: the former 24x18/manual-import script duplicated
// product rules that now live in the executable cross-view UI/UX contract.
const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'ui-ux-contract.cjs')], {
  cwd: root,
  env: {
    ...process.env,
    NEKOPOLIS_URL: process.env.NEKOPOLIS_URL || 'http://127.0.0.1:5172',
  },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

console.log('Classroom code verification now delegates to the maintained test:core gate.');
console.log('Running: npm run test:core');

const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'test:core'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env }
});

if (result.error) {
    console.error(`Verification could not start: ${result.error.message}`);
    process.exitCode = 1;
} else {
    process.exitCode = result.status === null ? 1 : result.status;
}

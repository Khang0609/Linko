import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, '../../../apps/api');
const openapiJson = path.resolve(__dirname, '../openapi.json');

// Check args
const isCheck = process.argv.includes('--check');
const pythonScript = path.join(apiDir, 'scripts/export_openapi.py');

const scriptArgs = ['--output', openapiJson];
if (isCheck) {
  scriptArgs.push('--check');
}

let success = false;

// 1. Try running via uv
console.log(`Attempting to run via: uv run python ${pythonScript} ${scriptArgs.join(' ')}`);
const uvRes = spawnSync('uv', ['run', 'python', pythonScript, ...scriptArgs], {
  cwd: apiDir,
  shell: true,
  stdio: 'inherit',
});

if (uvRes.status === 0) {
  success = true;
} else {
  console.log('uv run failed or not found. Falling back to local virtual environment...');

  // 2. Fallback to direct python in virtualenv
  const isWin = process.platform === 'win32';
  const venvPython = isWin
    ? path.join(apiDir, '.venv/Scripts/python.exe')
    : path.join(apiDir, '.venv/bin/python');

  if (fs.existsSync(venvPython)) {
    console.log(`Running via: ${venvPython} ${pythonScript} ${scriptArgs.join(' ')}`);
    const venvRes = spawnSync(venvPython, [pythonScript, ...scriptArgs], {
      cwd: apiDir,
      stdio: 'inherit',
    });
    if (venvRes.status === 0) {
      success = true;
    }
  } else {
    // 3. Fallback to system python
    console.log(`Virtual env python not found. Trying system python...`);
    const systemRes = spawnSync('python', [pythonScript, ...scriptArgs], {
      cwd: apiDir,
      stdio: 'inherit',
    });
    if (systemRes.status === 0) {
      success = true;
    }
  }
}

if (!success) {
  console.error('Failed to export OpenAPI specification.');
  process.exit(1);
}

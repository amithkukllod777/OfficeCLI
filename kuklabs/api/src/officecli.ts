import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

const binary = process.env.OFFICECLI_BIN ?? 'officecli';
const timeoutMs = Number(process.env.OFFICECLI_TIMEOUT_MS ?? 120_000);

export async function assertOfficeCliAvailable(): Promise<void> {
  if (binary.includes('/')) await access(binary);
  const result = await runOfficeCli(['--version'], 10_000);
  if (result.code !== 0) throw new Error(`OfficeCLI unavailable: ${result.stderr || result.stdout}`);
}

export function runOfficeCli(args: string[], timeout = timeoutMs): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`OfficeCLI command timed out after ${timeout}ms`));
    }, timeout);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', code => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

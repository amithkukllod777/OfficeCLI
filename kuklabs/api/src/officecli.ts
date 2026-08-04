import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import type { Readable } from 'node:stream';

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

    const stdoutStream = child.stdout as Readable | null;
    const stderrStream = child.stderr as Readable | null;
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: NodeJS.Timeout;

    const rejectOnce = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectOnce(new Error(`OfficeCLI command timed out after ${timeout}ms`));
    }, timeout);

    if (!stdoutStream || !stderrStream) {
      rejectOnce(new Error('OfficeCLI process streams are unavailable'));
      return;
    }

    stdoutStream.setEncoding('utf8');
    stderrStream.setEncoding('utf8');
    stdoutStream.on('data', (chunk: string | Buffer) => { stdout += chunk.toString(); });
    stderrStream.on('data', (chunk: string | Buffer) => { stderr += chunk.toString(); });
    child.once('error', (error: Error) => rejectOnce(error));
    child.once('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

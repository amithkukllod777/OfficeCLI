import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { assertOfficeCliAvailable, runOfficeCli } from './officecli.js';

const app = Fastify({ logger: true, bodyLimit: 30 * 1024 * 1024 });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

const workRoot = process.env.KUKDOCS_WORK_ROOT ?? '/tmp/kukdocs';
const apiKey = process.env.KUKDOCS_API_KEY;
const allowedExtensions = new Set(['.docx', '.xlsx', '.pptx']);

app.addHook('onRequest', async request => {
  if (!apiKey || request.url === '/health') return;
  if (request.headers['x-api-key'] !== apiKey) {
    throw app.httpErrors.unauthorized('Invalid API key');
  }
});

app.get('/health', async (_request, reply) => {
  try {
    await assertOfficeCliAvailable();
    return { status: 'ok', service: 'kukdocs-engine-api' };
  } catch (error) {
    reply.code(503);
    return { status: 'degraded', error: error instanceof Error ? error.message : 'OfficeCLI unavailable' };
  }
});

const createSchema = z.object({
  format: z.enum(['docx', 'xlsx', 'pptx']),
  filename: z.string().min(1).max(120).optional()
});

app.post('/v1/documents', async (request, reply) => {
  const input = createSchema.parse(request.body);
  const jobId = nanoid();
  const dir = join(workRoot, jobId);
  await mkdir(dir, { recursive: true });
  const filename = sanitizeFilename(input.filename ?? `document.${input.format}`, `document.${input.format}`);
  const output = join(dir, filename);

  const result = await runOfficeCli(['create', output]);
  if (result.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    return reply.code(422).send({ jobId, status: 'failed', error: result.stderr || result.stdout });
  }

  return reply.code(201).send({ jobId, status: 'completed', outputPath: output });
});

app.post('/v1/documents/inspect', async (request, reply) => {
  const part = await request.file();
  if (!part) return reply.code(400).send({ error: 'A file is required' });

  const extension = extname(part.filename).toLowerCase();
  if (!allowedExtensions.has(extension)) return reply.code(415).send({ error: 'Only DOCX, XLSX and PPTX are supported' });

  const jobId = nanoid();
  const dir = join(workRoot, jobId);
  await mkdir(dir, { recursive: true });
  const inputPath = join(dir, sanitizeFilename(part.filename, `input${extension}`));
  await writeFile(inputPath, await part.toBuffer(), { flag: 'wx' });

  const result = await runOfficeCli(['view', inputPath, 'outline']);
  await rm(dir, { recursive: true, force: true });
  if (result.code !== 0) return reply.code(422).send({ jobId, status: 'failed', error: result.stderr || result.stdout });

  return { jobId, status: 'completed', outline: result.stdout };
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', details: error.flatten() });
  app.log.error(error);
  return reply.code(error.statusCode ?? 500).send({ error: error.message });
});

function sanitizeFilename(value: string, fallback: string): string {
  const name = basename(value).replace(/[^a-zA-Z0-9._-]/g, '_');
  return name.length > 0 ? name : fallback;
}

await mkdir(workRoot, { recursive: true });
const port = Number(process.env.PORT ?? 8080);
await app.listen({ port, host: '0.0.0.0' });

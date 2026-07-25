import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.env.KOALADATA_PLAYWRIGHT_ROOT || mkdtempSync(join(tmpdir(), 'koaladata-playwright-'));
const testEnvironment = {
	...process.env,
	KOALADATA_PLAYWRIGHT_ROOT: root,
	DATABASE_PATH: join(root, 'test.db'),
	DATA_DIRECTORY: join(root, 'data'),
	DISABLE_RATE_LIMIT: 'true',
	NODE_ENV: 'test',
	PORT: '4173',
	ORIGIN: 'http://127.0.0.1:4173',
	PLAYWRIGHT_EXTERNAL_SERVER: 'true',
	PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4173'
};
mkdirSync(testEnvironment.DATA_DIRECTORY, { recursive: true });

function run(command, args, env = process.env) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
		child.once('error', reject);
		child.once('exit', (code, signal) => resolve({ code: code ?? 1, signal }));
	});
}

async function waitForServer() {
	const deadline = Date.now() + 180_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch('http://127.0.0.1:4173/api/health');
			if (response.ok) return;
		} catch {
			// Server is still starting.
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error('Playwright server did not become healthy within 180 seconds.');
}

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is required to run the Playwright build.');
const build = await run(process.execPath, [npmCli, 'run', 'build']);
if (build.code !== 0) process.exit(build.code);

const server = spawn(process.execPath, ['server.mjs'], {
	cwd: process.cwd(),
	env: testEnvironment,
	stdio: 'inherit'
});
let serverExited = false;
server.once('exit', () => {
	serverExited = true;
});

let exitCode = 1;
try {
	await waitForServer();
	const playwrightCli = join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
	const result = await run(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], testEnvironment);
	exitCode = result.code;
} finally {
	if (!serverExited) server.kill('SIGTERM');
	await Promise.race([
		new Promise((resolve) => server.once('exit', resolve)),
		new Promise((resolve) => setTimeout(resolve, 12_000))
	]);
	if (!serverExited) server.kill('SIGKILL');
	try {
		rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	} catch (error) {
		console.error(`[Playwright Cleanup] ${error instanceof Error ? error.message : String(error)}`);
		exitCode = 1;
	}
}

process.exit(exitCode);

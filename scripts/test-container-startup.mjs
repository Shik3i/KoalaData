import { spawnSync } from 'node:child_process';

const image = process.env.KOALADATA_TEST_IMAGE || 'koaladata:pre-release';
const suffix = `${process.pid}-${Date.now()}`;
const dataVolume = `koaladata-startup-test-data-${suffix}`;
const backupVolume = `koaladata-startup-test-backups-${suffix}`;
const freshContainer = `koaladata-startup-test-fresh-${suffix}`;
const upgradeContainer = `koaladata-startup-test-upgrade-${suffix}`;
const adminPassword = 'container-startup-test-password-123';

function docker(args, { allowFailure = false, capture = false } = {}) {
	const result = spawnSync('docker', args, {
		encoding: 'utf8',
		stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
	});

	if (result.error) throw result.error;
	if (!allowFailure && result.status !== 0) {
		const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
		throw new Error(`docker ${args.join(' ')} failed with exit code ${result.status}${details ? `\n${details}` : ''}`);
	}
	return result;
}

function output(args, options = {}) {
	return docker(args, { ...options, capture: true }).stdout.trim();
}

function sleep(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForHealth(container) {
	for (let attempt = 0; attempt < 30; attempt += 1) {
		const running = output(
			['inspect', '--format', '{{.State.Running}}', container],
			{ allowFailure: true }
		);
		if (running !== 'true') break;

		const health = output(
			['exec', container, 'wget', '--quiet', '--output-document=-', 'http://127.0.0.1:3000/api/health'],
			{ allowFailure: true }
		);
		if (health.includes('"database":"healthy"')) return;
		await sleep(1000);
	}

	docker(['logs', container], { allowFailure: true });
	throw new Error(`${container} did not reach a healthy database state`);
}

function assertServerIsUnprivileged(container) {
	const uidLine = output(['exec', container, 'awk', '/^Uid:/{print $2}', '/proc/1/status']);
	if (uidLine === '0') throw new Error(`${container} server process is running as root`);
}

function runApplication(container) {
	docker([
		'run',
		'--detach',
		'--name',
		container,
		'--env',
		'NODE_ENV=production',
		'--env',
		'KOALADATA_ADMIN_USERNAME=admin',
		'--env',
		`KOALADATA_ADMIN_PASSWORD=${adminPassword}`,
		'--volume',
		`${dataVolume}:/data`,
		'--volume',
		`${backupVolume}:/backups`,
		image
	]);
}

function cleanup() {
	docker(['rm', '-f', freshContainer, upgradeContainer], { allowFailure: true, capture: true });
	docker(['volume', 'rm', dataVolume, backupVolume], { allowFailure: true, capture: true });
}

try {
	docker(['volume', 'create', dataVolume]);
	docker(['volume', 'create', backupVolume]);

	runApplication(freshContainer);
	await waitForHealth(freshContainer);
	assertServerIsUnprivileged(freshContainer);
	docker(['rm', '-f', freshContainer]);

	// Old releases wrote persistent files as root. Simulate that existing
	// installation before starting the release candidate again.
	docker([
		'run',
		'--rm',
		'--user',
		'0:0',
		'--entrypoint',
		'chown',
		'--volume',
		`${dataVolume}:/data`,
		'--volume',
		`${backupVolume}:/backups`,
		image,
		'-R',
		'0:0',
		'/data',
		'/backups'
	]);

	runApplication(upgradeContainer);
	await waitForHealth(upgradeContainer);
	assertServerIsUnprivileged(upgradeContainer);

	const owner = output(['exec', upgradeContainer, 'stat', '-c', '%u:%g', '/data/data.db']);
	if (owner !== '1000:1000') {
		throw new Error(`Database ownership was not migrated to node:node: ${owner}`);
	}

	console.log('Container startup verified for fresh and root-owned upgrade volumes');
} finally {
	cleanup();
}

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requestedTag = process.argv[2];
const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const expectedTag = `v${packageVersion}`;

if (requestedTag !== expectedTag || !/^v\d+\.\d+\.\d+$/.test(requestedTag)) {
	console.error(`Release tag must exactly match package.json: ${expectedTag}`);
	process.exit(1);
}

function command(executable, args, { allowFailure = false } = {}) {
	const result = spawnSync(executable, args, { encoding: 'utf8' });
	if (result.error) throw result.error;
	if (!allowFailure && result.status !== 0) {
		const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
		throw new Error(`${executable} ${args.join(' ')} failed${details ? `\n${details}` : ''}`);
	}
	return result;
}

function output(executable, args, options = {}) {
	return command(executable, args, options).stdout.trim();
}

if (output('git', ['status', '--porcelain'])) {
	throw new Error('Refusing to release from a dirty worktree');
}

if (output('git', ['branch', '--show-current']) !== 'master') {
	throw new Error('Releases must be created from master');
}

command('git', ['fetch', 'origin', 'master']);
const head = output('git', ['rev-parse', 'HEAD']);
const remoteHead = output('git', ['rev-parse', 'origin/master']);
if (head !== remoteHead) {
	throw new Error(`HEAD ${head} does not match origin/master ${remoteHead}`);
}

const runs = JSON.parse(
	output('gh', [
		'run',
		'list',
		'--repo',
		'Shik3i/KoalaData',
		'--workflow',
		'CI',
		'--commit',
		head,
		'--limit',
		'1',
		'--json',
		'status,conclusion,headSha,databaseId,url'
	])
);
const run = runs[0];
if (!run || run.headSha !== head || run.status !== 'completed' || run.conclusion !== 'success') {
	throw new Error(`No successful completed CI run exists for ${head}`);
}

if (output('git', ['tag', '--list', requestedTag])) {
	throw new Error(`Local tag already exists: ${requestedTag}`);
}
const remoteTag = command('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${requestedTag}`], {
	allowFailure: true
});
if (remoteTag.status === 0) throw new Error(`Remote tag already exists: ${requestedTag}`);
if (remoteTag.status !== 2) throw new Error(`Could not verify remote tag: ${requestedTag}`);

command('git', ['tag', '--annotate', requestedTag, '--message', requestedTag, head]);
command('git', ['push', 'origin', requestedTag]);
console.log(`Published ${requestedTag} from CI-verified commit ${head} (run ${run.databaseId})`);

import { readFileSync } from 'node:fs';

const workflowPath = '.github/workflows/publish-container.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const forbidden = [
	[/\bgh\s+release\s+(?:create|upload)\b/i, 'GitHub CLI release mutation'],
	[/action-gh-release|upload-release-asset|create-release/i, 'GitHub Release action'],
	[/contents:\s*write/i, 'write access to repository contents']
];

const violations = forbidden
	.filter(([pattern]) => pattern.test(workflow))
	.map(([, description]) => description);

if (!/^\s*contents:\s*read\s*$/m.test(workflow)) violations.push('missing contents: read permission');
if (!/^\s*packages:\s*write\s*$/m.test(workflow)) violations.push('missing packages: write permission');

if (violations.length > 0) {
	console.error(`${workflowPath} violates the container-only publishing policy: ${violations.join(', ')}`);
	process.exit(1);
}

console.log(`${workflowPath}: container-only publishing policy verified`);

import { readFileSync } from 'node:fs';

const workflowPath = '.github/workflows/publish-container.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const ciWorkflowPath = '.github/workflows/ci.yml';
const ciWorkflow = readFileSync(ciWorkflowPath, 'utf8');
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
if (!/^\s*actions:\s*read\s*$/m.test(workflow)) violations.push('missing actions: read permission');
for (const [path, contents] of [
	[workflowPath, workflow],
	[ciWorkflowPath, ciWorkflow]
]) {
	if (!contents.includes('node scripts/test-container-startup.mjs')) {
		violations.push(`${path} missing container startup gate`);
	}
	if (!contents.includes('cache-from: type=gha,scope=koaladata-container')) {
		violations.push(`${path} missing shared container cache input`);
	}
	if (!contents.includes('cache-to: type=gha,mode=max,scope=koaladata-container')) {
		violations.push(`${path} missing shared container cache output`);
	}
}

const buildActionCount = workflow.match(/uses:\s*docker\/build-push-action@/g)?.length ?? 0;
if (buildActionCount !== 1) violations.push(`expected one release image build, found ${buildActionCount}`);
if (!/^\s*push:\s*true\s*$/m.test(workflow)) violations.push('release candidate must be pushed once by digest');
if (!workflow.includes('tags: ghcr.io/shik3i/koaladata:release-candidate')) {
	violations.push('release build must only push the non-production candidate tag');
}
if (!workflow.includes('KOALADATA_TEST_IMAGE: ghcr.io/shik3i/koaladata@${{ steps.build.outputs.digest }}')) {
	violations.push('container startup gate must test the built candidate digest');
}
if (!workflow.includes('--workflow CI') || !workflow.includes('No successful completed CI run exists')) {
	violations.push('missing successful commit CI verification');
}
if (!workflow.includes('docker buildx imagetools create')) {
	violations.push('missing digest promotion for latest');
}
const startupGateIndex = workflow.indexOf('node scripts/test-container-startup.mjs');
const digestPromotionIndex = workflow.indexOf('docker buildx imagetools create');
if (startupGateIndex === -1 || digestPromotionIndex === -1 || startupGateIndex > digestPromotionIndex) {
	violations.push('release tag promotion must follow the container startup gate');
}

if (violations.length > 0) {
	console.error(`${workflowPath} violates the container-only publishing policy: ${violations.join(', ')}`);
	process.exit(1);
}

console.log(`${workflowPath}: container-only publishing policy verified`);

import { rmSync } from 'node:fs';

export default function teardown() {
	const testRoot = process.env.KOALADATA_PLAYWRIGHT_ROOT;
	if (testRoot) rmSync(testRoot, { recursive: true, force: true });
}

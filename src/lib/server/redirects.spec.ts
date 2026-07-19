import { describe, expect, it } from 'vitest';
import { safeInternalRedirect } from './redirects';

describe('safeInternalRedirect', () => {
	it('allows local absolute paths', () => {
		expect(safeInternalRedirect('/app/projects/123?tab=metrics')).toBe('/app/projects/123?tab=metrics');
	});

	it('rejects external and protocol-relative targets', () => {
		expect(safeInternalRedirect('https://example.com')).toBe('/app');
		expect(safeInternalRedirect('//example.com')).toBe('/app');
		expect(safeInternalRedirect('/\\example.com')).toBe('/app');
	});
});

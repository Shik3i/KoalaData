import { describe, expect, it } from 'vitest';
import { minimizeIpAddress, minimizeUserAgent } from './privacy';

describe('privacy minimization', () => {
	it('minimizes IPv4 and IPv6 network identifiers', () => {
		expect(minimizeIpAddress('203.0.113.42')).toBe('203.0.113.0');
		expect(minimizeIpAddress('2001:db8:abcd:12::1')).toBe('2001:db8:abcd::');
		expect(minimizeIpAddress('2001:db8::1234')).toBe('2001:db8:0::');
		expect(minimizeIpAddress('::1')).toBe('::');
		expect(minimizeIpAddress('not-an-ip')).toBeNull();
	});

	it('removes control characters and limits user agents', () => {
		expect(minimizeUserAgent('Browser\nInjected')).toBe('Browser Injected');
		expect(minimizeUserAgent('a'.repeat(300))).toHaveLength(255);
	});
});

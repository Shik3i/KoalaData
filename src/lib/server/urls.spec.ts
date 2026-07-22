import { describe, expect, it } from 'vitest';
import { extractChromeExtensionId, normalizeChromeStoreUrl, normalizeOptionalHttpsUrl } from './urls';

describe('external URL validation', () => {
	it('accepts and normalizes HTTPS URLs', () => {
		expect(normalizeOptionalHttpsUrl('https://example.com/path', 'Website URL')).toBe('https://example.com/path');
		expect(normalizeOptionalHttpsUrl('', 'Website URL')).toBeNull();
	});

	it('rejects unsafe and credential-bearing URLs', () => {
		expect(() => normalizeOptionalHttpsUrl('javascript:alert(1)', 'Website URL')).toThrow('must use HTTPS');
		expect(() => normalizeOptionalHttpsUrl('http://example.com', 'Website URL')).toThrow('must use HTTPS');
		expect(() => normalizeOptionalHttpsUrl('https://user:pass@example.com', 'Website URL')).toThrow('embedded credentials');
	});

	it('accepts only canonical Chrome Web Store item URLs', () => {
		const id = 'abcdefghijklmnopabcdefghijklmnop';
		expect(normalizeChromeStoreUrl(`https://chromewebstore.google.com/detail/example/${id}?hl=de`))
			.toBe(`https://chromewebstore.google.com/detail/example/${id}`);
		expect(extractChromeExtensionId(`https://chromewebstore.google.com/detail/example/${id}`)).toBe(id);
		expect(() => normalizeChromeStoreUrl(`https://example.com/${id}`)).toThrow('chromewebstore.google.com');
	});
});

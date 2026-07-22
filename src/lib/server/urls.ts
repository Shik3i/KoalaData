const CHROME_EXTENSION_ID = /^[a-p]{32}$/;
const CHROME_STORE_HOSTS = new Set(['chromewebstore.google.com']);

export function normalizeOptionalHttpsUrl(value: string | null | undefined, label: string): string | null {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) return null;

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new Error(`${label} must be a valid absolute URL.`);
	}

	if (parsed.protocol !== 'https:') {
		throw new Error(`${label} must use HTTPS.`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${label} must not contain embedded credentials.`);
	}

	return parsed.toString();
}

export function normalizeChromeStoreUrl(value: string | null | undefined): string | null {
	const normalized = normalizeOptionalHttpsUrl(value, 'Chrome Web Store URL');
	if (!normalized) return null;

	const parsed = new URL(normalized);
	if (!CHROME_STORE_HOSTS.has(parsed.hostname.toLowerCase())) {
		throw new Error('Chrome Web Store URL must point to chromewebstore.google.com.');
	}

	const extensionId = parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
	if (!CHROME_EXTENSION_ID.test(extensionId)) {
		throw new Error('Chrome Web Store URL must contain a valid 32-character extension ID.');
	}

	parsed.search = '';
	parsed.hash = '';
	return parsed.toString();
}

export function extractChromeExtensionId(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const parsed = new URL(value);
		const candidate = parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
		return CHROME_EXTENSION_ID.test(candidate) ? candidate : null;
	} catch {
		return null;
	}
}

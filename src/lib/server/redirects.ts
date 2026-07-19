export function safeInternalRedirect(value: FormDataEntryValue | string | null | undefined, fallback = '/app') {
	const target = typeof value === 'string' ? value : '';
	if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
		return fallback;
	}
	return target;
}

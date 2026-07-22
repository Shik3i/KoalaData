/**
 * Reduce network identifiers before they are persisted. IPv4 addresses retain
 * only the /24 network; IPv6 addresses retain at most the first three groups.
 */
export function minimizeIpAddress(value: string | null | undefined): string | null {
	const input = value?.trim();
	if (!input) return null;
	if (input === '::1' || input === '0:0:0:0:0:0:0:1') return '::';

	const mappedIpv4 = input.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
	if (mappedIpv4) {
		const minimized = minimizeIpAddress(mappedIpv4[2]);
		return minimized ? `${mappedIpv4[1]}${minimized}` : null;
	}

	const ipv4 = input.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4 && ipv4.slice(1).every((part) => Number(part) <= 255)) {
		return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0`;
	}

	if (input.includes(':') && /^[0-9a-f:]+$/i.test(input)) {
		const halves = input.split('::');
		if (halves.length > 2) return null;

		const left = halves[0] ? halves[0].split(':') : [];
		const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
		const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
		if (halves.length === 2 && missing < 1) return null;

		const groups =
			halves.length === 2 ? [...left, ...Array(missing).fill('0'), ...right] : left;
		if (
			groups.length !== 8 ||
			groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))
		) {
			return null;
		}

		return `${groups[0]}:${groups[1]}:${groups[2]}::`;
	}

	return null;
}

export function minimizeUserAgent(value: string | null | undefined): string | null {
	const cleaned = value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
	return cleaned ? cleaned.slice(0, 255) : null;
}

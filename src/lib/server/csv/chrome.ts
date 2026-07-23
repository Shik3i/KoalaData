export interface ChromeDetectionResult {
	confidence: 'high' | 'low';
	mappings: Record<string, { column: string; metricType: string }>;
}

import { CHROME_HEADER_ALIASES } from '$lib/chrome-report-catalog';

// Aliases for Chrome Web Store standard exports
function normalizeHeader(header: string): string {
	if (!header) return '';
	return String(header)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[–—]/g, '-')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ');
}

const normalizedAliases = Object.fromEntries(
	Object.entries(CHROME_HEADER_ALIASES).map(([key, aliases]) => [key, aliases.map(normalizeHeader)])
) as Record<keyof typeof CHROME_HEADER_ALIASES, string[]>;

function isNumericCell(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed === '') return true;
	return /^[+-]?(?:\d[\d\s\u00a0.,']*|[.,]\d+)$/.test(trimmed);
}

function isNumericColumn(rows: string[][], columnIndex: number): boolean {
	const sample = rows
		.slice(0, 25)
		.map((row) => row[columnIndex] ?? '')
		.filter((value) => value.trim() !== '');

	return sample.length > 0 && sample.every(isNumericCell);
}

/**
 * Scan headers for standard Chrome Web Store export columns.
 * Returns the mapped columns and a confidence rating.
 */
export function detectChromeCsv(headers: string[], rows: string[][] = []): ChromeDetectionResult {
	const normalizedHeaders = headers.map(normalizeHeader);
	const mappings: Record<string, { column: string; metricType: string }> = {};
	let matchCount = 0;

	// Find date column
	let dateColumn: string | null = null;
	for (let i = 0; i < headers.length; i++) {
		if (normalizedAliases.date.includes(normalizedHeaders[i])) {
			dateColumn = headers[i];
			mappings['date'] = { column: headers[i], metricType: 'date' };
			break;
		}
	}

	// Map other metrics
	const checkAndMap = (aliases: string[], metricType: string) => {
		for (let i = 0; i < headers.length; i++) {
			if (aliases.includes(normalizedHeaders[i])) {
				mappings[metricType] = { column: headers[i], metricType };
				matchCount++;
				break;
			}
		}
	};

	checkAndMap(normalizedAliases.active_users, 'active_users');
	checkAndMap(normalizedAliases.installs, 'installs');
	checkAndMap(normalizedAliases.uninstalls, 'uninstalls');
	checkAndMap(normalizedAliases.store_page_views, 'store_page_views');
	checkAndMap(normalizedAliases.store_impressions, 'store_impressions');

	// Chrome also exports valid time series with one numeric column per
	// operating system, language, region, extension version, rating, or state.
	// These are custom metrics, but they should not require manual mapping.
	if (dateColumn) {
		const dateIndex = headers.indexOf(dateColumn);
		for (let i = 0; i < headers.length; i++) {
			if (i === dateIndex || Object.values(mappings).some((mapping) => mapping.column === headers[i])) continue;
			if (!isNumericColumn(rows, i)) continue;

			mappings[`custom:${i}`] = { column: headers[i], metricType: 'custom' };
			matchCount++;
		}
	}

	// High confidence if we found the date column and at least 1 metric matches.
	const confidence = dateColumn && matchCount >= 1 ? 'high' : 'low';

	return {
		confidence,
		mappings
	};
}

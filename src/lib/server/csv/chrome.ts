export interface ChromeDetectionResult {
	confidence: 'high' | 'low';
	mappings: Record<string, { column: string; metricType: string }>;
}

// Aliases for Chrome Web Store standard exports
const DATE_ALIASES = ['date', 'time', 'date_utc', 'timestamp', 'day', 'datum'];
const ACTIVE_USERS_ALIASES = [
	'weekly active users',
	'active users',
	'users',
	'active_users',
	'weekly_active_users',
	'nutzer pro woche',
	'wöchentlich aktive nutzer',
	'wöchentliche nutzer insgesamt'
];
const INSTALLS_ALIASES = [
	'daily installs',
	'installs',
	'daily_installs',
	'downloads',
	'download_count',
	'installationen',
	'tägliche installationen'
];
const UNINSTALLS_ALIASES = [
	'daily uninstalls',
	'uninstalls',
	'daily_uninstalls',
	'deinstallationen',
	'tägliche deinstallationen'
];
const PAGE_VIEWS_ALIASES = [
	'store page views',
	'page views',
	'pageviews',
	'store_views',
	'store_page_views',
	'seitenaufrufe',
	'store-seitenaufrufe'
];
const IMPRESSIONS_ALIASES = [
	'impressions',
	'store impressions',
	'store_impressions',
	'impressionen',
	'store-impressionen'
];

/**
 * Scan headers for standard Chrome Web Store export columns.
 * Returns the mapped columns and a confidence rating.
 */
export function detectChromeCsv(headers: string[]): ChromeDetectionResult {
	const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
	const mappings: Record<string, { column: string; metricType: string }> = {};
	let matchCount = 0;

	// Find date column
	let dateColumn: string | null = null;
	for (let i = 0; i < headers.length; i++) {
		if (DATE_ALIASES.includes(normalizedHeaders[i])) {
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

	checkAndMap(ACTIVE_USERS_ALIASES, 'active_users');
	checkAndMap(INSTALLS_ALIASES, 'installs');
	checkAndMap(UNINSTALLS_ALIASES, 'uninstalls');
	checkAndMap(PAGE_VIEWS_ALIASES, 'store_page_views');
	checkAndMap(IMPRESSIONS_ALIASES, 'store_impressions');

	// High confidence if we found the date column and at least 1 metric matches.
	const confidence = dateColumn && matchCount >= 1 ? 'high' : 'low';

	return {
		confidence,
		mappings
	};
}

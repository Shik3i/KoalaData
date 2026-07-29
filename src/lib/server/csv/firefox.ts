export interface FirefoxAmoDetectionResult {
	confidence: 'high' | 'low';
	mappings: Record<string, { column: string; metricType: string }>;
	report: 'downloads' | 'usage' | null;
}

function normalizeHeader(header: string): string {
	return String(header ?? '').trim().toLowerCase();
}

function reportFromFilename(filename: string): 'downloads' | 'usage' | null {
	const basename = filename.split(/[\\/]/).at(-1)?.toLowerCase() ?? '';
	if (/^downloads-day-\d{8}-\d{8}\.csv$/.test(basename)) return 'downloads';
	if (/^usage-day-\d{8}-\d{8}\.csv$/.test(basename)) return 'usage';
	return null;
}

/**
 * Detects the two official daily CSV reports exported by addons.mozilla.org.
 * Filename and exact AMO columns are both required so an arbitrary date/count
 * CSV is never silently assigned Firefox semantics.
 */
export function detectFirefoxAmoCsv(
	filename: string,
	headers: string[]
): FirefoxAmoDetectionResult {
	const report = reportFromFilename(filename);
	const dateIndex = headers.findIndex((header) => normalizeHeader(header) === 'date');
	const countIndex = headers.findIndex((header) => normalizeHeader(header) === 'count');
	const mappings: FirefoxAmoDetectionResult['mappings'] = {};

	if (dateIndex !== -1) {
		mappings.date = { column: headers[dateIndex], metricType: 'date' };
	}
	if (report && countIndex !== -1) {
		mappings[report] = {
			column: headers[countIndex],
			metricType: report === 'downloads' ? 'downloads' : 'active_users'
		};
	}

	return {
		confidence: report && dateIndex !== -1 && countIndex !== -1 ? 'high' : 'low',
		mappings,
		report
	};
}

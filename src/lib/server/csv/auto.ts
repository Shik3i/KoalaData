import { classifyChromeReportFilename } from '$lib/dashboard-metrics';
import { detectChromeCsv } from './chrome';
import { detectFirefoxAmoCsv } from './firefox';
import type { ParsedCsv } from './parser';

export type AutomaticImporter = 'chrome_auto' | 'firefox_auto';

export interface AutomaticImportConfig {
	dateColumn: string;
	dateFormat: string;
	metrics: Array<{
		columnName: string;
		metricType: string;
		name: string;
		unit: string;
		aggregation: string;
		isCumulative: boolean;
		dimensions?: Record<string, string>;
	}>;
}

export interface AutomaticImportResult {
	detectedImporter: AutomaticImporter;
	mappingConfig: AutomaticImportConfig;
}

function buildChromeConfig(
	originalFilename: string,
	parsed: ParsedCsv
): AutomaticImportConfig | null {
	const autoDetect = detectChromeCsv(parsed.headers, parsed.rows);
	const report = classifyChromeReportFilename(originalFilename);
	const hasStandardMetric = Object.values(autoDetect.mappings).some(
		(mapping) => mapping.metricType !== 'date' && mapping.metricType !== 'custom'
	);
	const hasCustomMetric = Object.values(autoDetect.mappings).some(
		(mapping) => mapping.metricType === 'custom'
	);
	if (!autoDetect.mappings.date || !(report || (hasStandardMetric && !hasCustomMetric))) {
		return null;
	}

	const fileLabel = originalFilename
		.replace(/\.[^.]+$/, '')
		.replace(/_[a-z0-9]{32}$/i, '')
		.trim();
	const metrics = Object.entries(autoDetect.mappings)
		.filter(([key, value]) => key !== 'date' && Boolean(value?.column))
		.map(([, value]) => ({
			columnName: value.column,
			metricType: value.metricType || 'custom',
			name:
				value.metricType === 'custom' && report
					? fileLabel
					: value.metricType === 'custom'
						? `${fileLabel}: ${value.column}`
						: value.column,
			unit: 'count',
			aggregation:
				value.metricType === 'active_users' || report?.semantics === 'snapshot'
					? 'latest'
					: 'sum',
			isCumulative: false,
			dimensions:
				value.metricType === 'custom' && report
					? { [report.dimensionKey]: value.column }
					: undefined
		}));

	if (metrics.length === 0) return null;
	return {
		dateColumn: autoDetect.mappings.date.column,
		dateFormat: 'YYYY-MM-DD',
		metrics
	};
}

function buildFirefoxConfig(
	originalFilename: string,
	parsed: ParsedCsv
): AutomaticImportConfig | null {
	const detection = detectFirefoxAmoCsv(originalFilename, parsed.headers);
	if (detection.confidence !== 'high' || !detection.report) return null;
	const metric = detection.mappings[detection.report];
	if (!detection.mappings.date || !metric) return null;

	return {
		dateColumn: detection.mappings.date.column,
		dateFormat: 'YYYY-MM-DD',
		metrics: [
			{
				columnName: metric.column,
				metricType: metric.metricType,
				name: detection.report === 'downloads' ? 'Firefox Downloads' : 'Firefox Daily Users',
				unit: 'count',
				aggregation: detection.report === 'usage' ? 'latest' : 'sum',
				isCumulative: false
			}
		]
	};
}

export function getAutomaticImport(
	sourceType: string,
	originalFilename: string,
	parsed: ParsedCsv
): AutomaticImportResult | null {
	if (sourceType === 'chrome_web_store') {
		const mappingConfig = buildChromeConfig(originalFilename, parsed);
		return mappingConfig ? { detectedImporter: 'chrome_auto', mappingConfig } : null;
	}
	if (sourceType === 'firefox_amo') {
		const mappingConfig = buildFirefoxConfig(originalFilename, parsed);
		return mappingConfig ? { detectedImporter: 'firefox_auto', mappingConfig } : null;
	}
	return null;
}

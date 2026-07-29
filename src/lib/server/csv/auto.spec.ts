import { describe, expect, it } from 'vitest';
import { getAutomaticImport } from './auto';
import { parseCsv } from './parser';

const amoCsv = (report: 'downloads' | 'usage') =>
	parseCsv(Buffer.from([
		'# addons.mozilla.org Statistics for add-on KoalaSync',
		'# Generated Wed Jul 29 21:24:55 2026 +0000',
		`# from https://addons.mozilla.org/firefox/addon/koalasync/statistics/${report}-day-20250729-20260728.csv`,
		'date,count',
		'2026-07-28,2',
		'2026-07-27,3'
	].join('\n')));

describe('automatic CSV import selection', () => {
	it('builds a summed downloads mapping for an official AMO download report', () => {
		const result = getAutomaticImport(
			'firefox_amo',
			'downloads-day-20250729-20260728.csv',
			amoCsv('downloads')
		);

		expect(result).toMatchObject({
			detectedImporter: 'firefox_auto',
			mappingConfig: {
				dateColumn: 'date',
				dateFormat: 'YYYY-MM-DD',
				metrics: [{
					columnName: 'count',
					metricType: 'downloads',
					name: 'Firefox Downloads',
					aggregation: 'sum'
				}]
			}
		});
	});

	it('builds a latest-value active-user mapping for an official AMO usage report', () => {
		const result = getAutomaticImport(
			'firefox_amo',
			'usage-day-20250729-20260728.csv',
			amoCsv('usage')
		);

		expect(result).toMatchObject({
			detectedImporter: 'firefox_auto',
			mappingConfig: {
				metrics: [{
					metricType: 'active_users',
					name: 'Firefox Daily Users',
					aggregation: 'latest'
				}]
			}
		});
	});

	it('does not run Firefox detection for Edge, Chrome, or generic sources', () => {
		const parsed = amoCsv('downloads');
		expect(getAutomaticImport('edge_add_ons', 'downloads-day-20250729-20260728.csv', parsed)).toBeNull();
		expect(getAutomaticImport('chrome_web_store', 'downloads-day-20250729-20260728.csv', parsed)).toBeNull();
		expect(getAutomaticImport('generic_csv', 'downloads-day-20250729-20260728.csv', parsed)).toBeNull();
	});
});

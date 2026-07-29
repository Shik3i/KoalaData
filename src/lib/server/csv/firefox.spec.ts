import { describe, expect, it } from 'vitest';
import { detectFirefoxAmoCsv } from './firefox';

describe('Firefox AMO CSV detection', () => {
	it('maps official downloads and usage daily exports', () => {
		expect(
			detectFirefoxAmoCsv('downloads-day-20250729-20260728.csv', ['date', 'count'])
		).toEqual({
			confidence: 'high',
			report: 'downloads',
			mappings: {
				date: { column: 'date', metricType: 'date' },
				downloads: { column: 'count', metricType: 'downloads' }
			}
		});

		expect(
			detectFirefoxAmoCsv('usage-day-20250729-20260728.csv', ['date', 'count'])
		).toEqual({
			confidence: 'high',
			report: 'usage',
			mappings: {
				date: { column: 'date', metricType: 'date' },
				usage: { column: 'count', metricType: 'active_users' }
			}
		});
	});

	it('does not assign Firefox semantics from generic date/count columns', () => {
		const result = detectFirefoxAmoCsv('revenue.csv', ['date', 'count']);
		expect(result.confidence).toBe('low');
		expect(result.report).toBeNull();
		expect(result.mappings).toEqual({
			date: { column: 'date', metricType: 'date' }
		});
	});

	it('requires the official date and count columns', () => {
		const result = detectFirefoxAmoCsv(
			'downloads-day-20250729-20260728.csv',
			['day', 'downloads']
		);
		expect(result.confidence).toBe('low');
		expect(result.mappings).toEqual({});
	});
});

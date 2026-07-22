import { describe, expect, it } from 'vitest';
import { detectChromeCsv } from './chrome';

describe('Chrome Web Store CSV detection', () => {
	it('maps German standard metrics and date columns', () => {
		const result = detectChromeCsv(
			['Datum', 'Installationen', 'Deinstallationen', 'Seitenaufrufe', 'Impressionen'],
			[
				['22.04.26', '4', '1', '12', '30'],
				['23.04.26', '5', '0', '14', '34']
			]
		);

		expect(result.confidence).toBe('high');
		expect(result.mappings.date).toEqual({ column: 'Datum', metricType: 'date' });
		expect(result.mappings.installs).toEqual({ column: 'Installationen', metricType: 'installs' });
		expect(result.mappings.uninstalls).toEqual({ column: 'Deinstallationen', metricType: 'uninstalls' });
		expect(result.mappings.store_page_views).toEqual({ column: 'Seitenaufrufe', metricType: 'store_page_views' });
		expect(result.mappings.store_impressions).toEqual({ column: 'Impressionen', metricType: 'store_impressions' });
	});

	it('maps numeric dimension and special columns as custom metrics', () => {
		const result = detectChromeCsv(
			['Datum', 'Linux', 'Mac OS', 'Aktiviert', 'Deaktiviert', 'Fünf Sterne'],
			[
				['22.04.26', '1', '2', '10', '3', '1'],
				['23.04.26', '0', '4', '11', '2', '0']
			]
		);

		expect(result.confidence).toBe('high');
		expect(Object.values(result.mappings).filter((mapping) => mapping.metricType === 'custom')).toEqual([
			{ column: 'Linux', metricType: 'custom' },
			{ column: 'Mac OS', metricType: 'custom' },
			{ column: 'Aktiviert', metricType: 'custom' },
			{ column: 'Deaktiviert', metricType: 'custom' },
			{ column: 'Fünf Sterne', metricType: 'custom' }
		]);
	});

	it('does not auto-map non-numeric dimensions', () => {
		const result = detectChromeCsv(
			['Datum', 'Region', 'Installationen'],
			[
				['22.04.26', 'Deutschland', '4'],
				['23.04.26', 'Deutschland', '5']
			]
		);

		expect(result.mappings.installs).toEqual({ column: 'Installationen', metricType: 'installs' });
		expect(Object.values(result.mappings).filter((mapping) => mapping.metricType === 'custom')).toHaveLength(0);
	});
});

import { describe, expect, it } from 'vitest';
import {
	buildChartShareText,
	chartExportSlug,
	compactChartNumber,
	resolveChartExportSize,
	revealChartValues
} from './chart-export';

describe('chart social exports', () => {
	it('uses fixed social sizes and preserves a bounded original ratio', () => {
		expect(resolveChartExportSize('wide', 375, 320)).toMatchObject({ width: 1200, height: 628 });
		expect(resolveChartExportSize('square', 375, 320)).toMatchObject({ width: 1200, height: 1200 });
		expect(resolveChartExportSize('portrait', 375, 320)).toMatchObject({ width: 1080, height: 1350 });
		expect(resolveChartExportSize('original', 375, 320)).toMatchObject({ width: 800, height: 943 });
	});

	it('reveals a series progressively without mutating the source', () => {
		const values = [1, 2, null, 4, 5];
		expect(revealChartValues(values, 0)).toEqual([1, null, null, null, null]);
		expect(revealChartValues(values, 0.5)).toEqual([1, 2, null, null, null]);
		expect(revealChartValues(values, 1)).toEqual(values);
		expect(values).toEqual([1, 2, null, 4, 5]);
	});

	it('builds concise filenames, values and post copy', () => {
		expect(chartExportSlug('Köala Data / Weekly Users')).toBe('koala-data-weekly-users');
		expect(compactChartNumber(24_842)).toBe('24.8K');
		expect(buildChartShareText({
			projectName: 'KoalaSync',
			insight: '+1,284 net installs in the last 90 days',
			shareUrl: 'https://data.koalastuff.net/p/koalasync'
		})).toBe('KoalaSync: +1,284 net installs in the last 90 days\n\nLive analytics:\nhttps://data.koalastuff.net/p/koalasync');
	});
});

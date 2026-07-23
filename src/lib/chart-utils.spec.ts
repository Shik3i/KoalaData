import { describe, expect, it } from 'vitest';
import { chartDataZoom, computeLinearForecast, computeMovingAverage, prepareChartData } from './chart-utils';

describe('chart derived data', () => {
	it('keeps the moving average unavailable until a complete window exists', () => {
		expect(computeMovingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
		expect(computeMovingAverage([1, null, 3, 4], 3)).toEqual([null, null, null, null]);
	});

	it('projects a linear trend without producing negative values', () => {
		expect(computeLinearForecast([2, 4, 6], 3)).toEqual([8, 10, 12]);
		expect(computeLinearForecast([3, 2, 1], 2)).toEqual([0, 0]);
		expect(computeLinearForecast([1, 2], 3)).toBeNull();
		expect(computeLinearForecast([1, null, 3], 3)).toBeNull();
	});

	it('offers only an explicit slider and never wheel or touchpad zoom', () => {
		expect(chartDataZoom(30)).toBeUndefined();
		expect(chartDataZoom(31)).toEqual([{ type: 'slider' }]);
		expect(chartDataZoom(31)?.some((zoom) => zoom.type === ('inside' as 'slider'))).toBe(false);
	});

	it('starts charts at the first non-zero datapoint across every series', () => {
		expect(prepareChartData([
			{ observations: [{ date: '2026-01-01', value: 0 }, { date: '2026-01-02', value: 0 }, { date: '2026-01-03', value: 4 }] },
			{ observations: [{ date: '2026-01-02', value: 0 }, { date: '2026-01-03', value: 0 }, { date: '2026-01-04', value: 0 }] }
		])).toEqual({
			dates: ['2026-01-03', '2026-01-04'],
			seriesValues: [[4, null], [0, 0]]
		});
	});

	it('keeps zero values after data starts and returns no chart for an all-zero timeframe', () => {
		expect(prepareChartData([
			{ observations: [{ date: '2026-01-01', value: 0 }, { date: '2026-01-02', value: 3 }, { date: '2026-01-03', value: 0 }] }
		])).toEqual({ dates: ['2026-01-02', '2026-01-03'], seriesValues: [[3, 0]] });
		expect(prepareChartData([
			{ observations: [{ date: '2026-01-01', value: 0 }, { date: '2026-01-02', value: 0 }] }
		])).toEqual({ dates: [], seriesValues: [[]] });
	});

	it('trims aligned comparison labels without shifting series against each other', () => {
		expect(prepareChartData([
			{ observations: [{ date: 'old-1', value: 0 }, { date: 'old-2', value: 2 }] },
			{ observations: [{ date: 'new-1', value: 0 }, { date: 'new-2', value: 5 }] }
		], ['Day 1', 'Day 2'])).toEqual({
			dates: ['Day 2'],
			seriesValues: [[2], [5]]
		});
	});
});

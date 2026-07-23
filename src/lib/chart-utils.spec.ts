import { describe, expect, it } from 'vitest';
import { chartDataZoom, computeLinearForecast, computeMovingAverage } from './chart-utils';

describe('chart derived data', () => {
	it('keeps the moving average unavailable until a complete window exists', () => {
		expect(computeMovingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
	});

	it('projects a linear trend without producing negative values', () => {
		expect(computeLinearForecast([2, 4, 6], 3)).toEqual([8, 10, 12]);
		expect(computeLinearForecast([3, 2, 1], 2)).toEqual([0, 0]);
		expect(computeLinearForecast([1, 2], 3)).toBeNull();
	});

	it('offers only an explicit slider and never wheel or touchpad zoom', () => {
		expect(chartDataZoom(30)).toBeUndefined();
		expect(chartDataZoom(31)).toEqual([{ type: 'slider' }]);
		expect(chartDataZoom(31)?.some((zoom) => zoom.type === ('inside' as 'slider'))).toBe(false);
	});
});

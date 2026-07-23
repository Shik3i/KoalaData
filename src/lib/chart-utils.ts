export function computeMovingAverage(data: (number | null)[], windowSize = 7): (number | null)[] {
	const result: (number | null)[] = [];
	for (let i = 0; i < data.length; i++) {
		if (i < windowSize - 1) {
			result.push(null);
			continue;
		}

		const window = data.slice(i - windowSize + 1, i + 1);
		if (window.some((value) => value === null)) {
			result.push(null);
			continue;
		}
		let sum = 0;
		for (const value of window) sum += value!;
		result.push(sum / windowSize);
	}
	return result;
}

export function computeLinearForecast(data: (number | null)[], steps: number): number[] | null {
	const n = data.length;
	if (n < 3 || steps < 1 || data.some((value) => value === null)) return null;
	const values = data as number[];

	const xMean = (n - 1) / 2;
	const yMean = values.reduce((sum, value) => sum + value, 0) / n;
	let numerator = 0;
	let denominator = 0;

	for (let i = 0; i < n; i++) {
		numerator += (i - xMean) * (values[i] - yMean);
		denominator += (i - xMean) * (i - xMean);
	}

	const slope = denominator === 0 ? 0 : numerator / denominator;
	const intercept = yMean - slope * xMean;
	return Array.from({ length: steps }, (_, index) => Math.max(0, slope * (n + index) + intercept));
}

export type ChartDataZoom = { type: 'slider' };

export type ChartObservation = { date: string; value: number };

export type PreparedChartData = {
	dates: string[];
	seriesValues: (number | null)[][];
};

export function prepareChartData(
	series: { observations: ChartObservation[] }[],
	categoryLabels?: string[]
): PreparedChartData {
	const dates = categoryLabels?.length
		? [...categoryLabels]
		: [...new Set(series.flatMap((item) => item.observations.map((observation) => observation.date)))].sort();
	const seriesValues = series.map((item) => {
		if (categoryLabels?.length) {
			return dates.map((_, index) => item.observations[index]?.value ?? null);
		}
		const valuesByDate = new Map(item.observations.map((observation) => [observation.date, observation.value]));
		return dates.map((date) => valuesByDate.get(date) ?? null);
	});
	const firstDataIndex = dates.findIndex((_, index) =>
		seriesValues.some((values) => values[index] !== null && values[index] !== 0)
	);

	if (firstDataIndex === -1) return { dates: [], seriesValues: seriesValues.map(() => []) };
	return {
		dates: dates.slice(firstDataIndex),
		seriesValues: seriesValues.map((values) => values.slice(firstDataIndex))
	};
}

export function chartDataZoom(pointCount: number): ChartDataZoom[] | undefined {
	return pointCount > 30 ? [{ type: 'slider' }] : undefined;
}

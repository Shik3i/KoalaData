export function computeMovingAverage(data: number[], windowSize = 7): (number | null)[] {
	const result: (number | null)[] = [];
	for (let i = 0; i < data.length; i++) {
		if (i < windowSize - 1) {
			result.push(null);
			continue;
		}

		let sum = 0;
		for (let j = i - windowSize + 1; j <= i; j++) sum += data[j];
		result.push(sum / windowSize);
	}
	return result;
}

export function computeLinearForecast(data: number[], steps: number): number[] | null {
	const n = data.length;
	if (n < 3 || steps < 1) return null;

	const xMean = (n - 1) / 2;
	const yMean = data.reduce((sum, value) => sum + value, 0) / n;
	let numerator = 0;
	let denominator = 0;

	for (let i = 0; i < n; i++) {
		numerator += (i - xMean) * (data[i] - yMean);
		denominator += (i - xMean) * (i - xMean);
	}

	const slope = denominator === 0 ? 0 : numerator / denominator;
	const intercept = yMean - slope * xMean;
	return Array.from({ length: steps }, (_, index) => Math.max(0, slope * (n + index) + intercept));
}

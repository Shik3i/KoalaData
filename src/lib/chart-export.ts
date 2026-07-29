export type ChartExportFormat = 'wide' | 'square' | 'portrait' | 'original';
export type ChartExportTheme = 'current' | 'light' | 'dark';

export type ChartExportOptions = {
	format: ChartExportFormat;
	theme: ChartExportTheme;
	includeMovingAverage: boolean;
	includeEvents: boolean;
	includeIdentity: boolean;
	includeTitle: boolean;
	includeValue: boolean;
	includeInsight: boolean;
	includeDetails: boolean;
	includeBranding: boolean;
	includeLogo: boolean;
	customText: string;
	chartHeightPercent: number;
};

export type ChartExportSize = {
	width: number;
	height: number;
	label: string;
	description: string;
};

export const CHART_EXPORT_FORMATS: Record<Exclude<ChartExportFormat, 'original'>, ChartExportSize> = {
	wide: {
		width: 1200,
		height: 628,
		label: 'Social Wide',
		description: '1200 × 628 · X, Reddit, LinkedIn'
	},
	square: {
		width: 1200,
		height: 1200,
		label: 'Square',
		description: '1200 × 1200 · feeds and carousels'
	},
	portrait: {
		width: 1080,
		height: 1350,
		label: 'Portrait',
		description: '1080 × 1350 · mobile feeds'
	}
};

export function resolveChartExportSize(
	format: ChartExportFormat,
	originalWidth: number,
	originalHeight: number
): ChartExportSize {
	if (format !== 'original') return CHART_EXPORT_FORMATS[format];
	const width = Math.max(800, Math.round(originalWidth * 2));
	const chartRatio = originalHeight / Math.max(originalWidth, 1);
	const height = Math.max(560, Math.round(width * chartRatio + 260));
	return {
		width,
		height,
		label: 'Original',
		description: `${width} × ${height} · current chart ratio`
	};
}

export function compactChartNumber(value: number): string {
	return new Intl.NumberFormat('en', {
		notation: Math.abs(value) >= 1_000 ? 'compact' : 'standard',
		maximumFractionDigits: Math.abs(value) >= 1_000 ? 1 : 0
	}).format(value);
}

export function chartExportSlug(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'chart';
}

export function buildChartShareText({
	projectName,
	insight,
	heading,
	timeframe,
	shareUrl
}: {
	projectName?: string;
	insight?: string;
	heading?: string;
	timeframe?: string;
	shareUrl?: string;
}): string {
	const subject = projectName || heading || 'KoalaData chart';
	const statement = insight || [heading, timeframe].filter(Boolean).join(' · ');
	return [
		statement ? `${subject}: ${statement}` : subject,
		shareUrl ? `\nLive analytics:\n${shareUrl}` : ''
	].filter(Boolean).join('\n');
}

export function revealChartValues(values: (number | null)[], progress: number): (number | null)[] {
	if (progress >= 1) return [...values];
	const visibleCount = Math.max(1, Math.ceil(values.length * Math.max(0, progress)));
	return values.map((value, index) => index < visibleCount ? value : null);
}

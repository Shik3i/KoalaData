export type DashboardObservation = {
	date: string;
	value: number;
	dimensions?: Record<string, string>;
	completedAt?: number | null;
	observationId?: string;
};

export type DashboardMetric = {
	sourceId?: string;
	sourceName: string;
	metricId: string;
	metricType: string;
	name: string;
	unit?: string;
	aggregation: string;
	isCumulative?: number;
	observations: DashboardObservation[];
};

export type ReportSemantics = 'flow' | 'snapshot';
export type ReportSection = 'acquisition' | 'audience' | 'retention' | 'quality' | 'other';

export type ChromeReportClassification = {
	id: string;
	title: string;
	dimensionKey: string;
	semantics: ReportSemantics;
	section: ReportSection;
	unitLabel: string;
};

export type BreakdownSeries = {
	name: string;
	observations: DashboardObservation[];
};

export type BreakdownGroup = ChromeReportClassification & {
	key: string;
	sourceName: string;
	series: BreakdownSeries[];
};

export type BreakdownRow = {
	name: string;
	value: number;
	share: number;
	date: string | null;
};

import { CHROME_REPORT_PATTERNS } from '$lib/chrome-report-catalog';

export type BreakdownTimeline = {
	dates: string[];
	series: BreakdownSeries[];
};

export const DASHBOARD_PERIODS = [7, 30, 90, 365] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export type DashboardPeriodKey = '7' | '30' | '90' | '365';

export type BreakdownSummaryGroup = Omit<BreakdownGroup, 'series'> & {
	periodRows: Record<DashboardPeriodKey, BreakdownRow[]>;
	timeline: BreakdownTimeline | null;
};

const DIMENSION_LABELS: Record<string, string> = {
	aktiviert: 'Enabled', deaktiviert: 'Disabled', sonstiges: 'Other',
	'ein stern': '1 star', 'zwei sterne': '2 stars', 'drei sterne': '3 stars', 'vier sterne': '4 stars', 'funf sterne': '5 stars',
	algerien: 'Algeria', aserbaidschan: 'Azerbaijan', australien: 'Australia', bangladesch: 'Bangladesh',
	belarus: 'Belarus', belgien: 'Belgium', brasilien: 'Brazil', chile: 'Chile', china: 'China',
	deutschland: 'Germany', danemark: 'Denmark', ecuador: 'Ecuador', finnland: 'Finland', frankreich: 'France',
	ghana: 'Ghana', hongkong: 'Hong Kong', indien: 'India', indonesien: 'Indonesia', irak: 'Iraq', irland: 'Ireland',
	israel: 'Israel', italien: 'Italy', jamaika: 'Jamaica', japan: 'Japan', jordanien: 'Jordan', kanada: 'Canada',
	kasachstan: 'Kazakhstan', katar: 'Qatar', kenia: 'Kenya', malaysia: 'Malaysia', marokko: 'Morocco',
	mauritius: 'Mauritius', mexiko: 'Mexico', nepal: 'Nepal', neuseeland: 'New Zealand', niederlande: 'Netherlands',
	norwegen: 'Norway', pakistan: 'Pakistan', panama: 'Panama', peru: 'Peru', philippinen: 'Philippines',
	polen: 'Poland', portugal: 'Portugal', 'puerto rico': 'Puerto Rico', ruanda: 'Rwanda', rumanien: 'Romania',
	russland: 'Russia', sambia: 'Zambia', 'saudi arabien': 'Saudi Arabia', schweden: 'Sweden', schweiz: 'Switzerland',
	serbien: 'Serbia', singapur: 'Singapore', spanien: 'Spain', 'sri lanka': 'Sri Lanka', sudafrika: 'South Africa',
	sudkorea: 'South Korea', taiwan: 'Taiwan', 'trinidad und tobago': 'Trinidad and Tobago', tschechien: 'Czechia',
	tunesien: 'Tunisia', turkei: 'Turkey', usa: 'United States', ukraine: 'Ukraine', ungarn: 'Hungary',
	'vereinigte arabische emirate': 'United Arab Emirates', 'vereinigtes konigreich': 'United Kingdom', vietnam: 'Vietnam', agypten: 'Egypt',
	arabisch: 'Arabic', 'chinesisch china': 'Chinese (China)', 'chinesisch taiwan': 'Chinese (Taiwan)', deutsch: 'German',
	'englisch vereinigte staaten': 'English (United States)', 'englisch vereinigtes konigreich': 'English (United Kingdom)',
	franzosisch: 'French', italienisch: 'Italian', japanisch: 'Japanese', katalanisch: 'Catalan', koreanisch: 'Korean',
	norwegisch: 'Norwegian', polnisch: 'Polish', 'portugiesisch brasilien': 'Portuguese (Brazil)', russisch: 'Russian',
	schwedisch: 'Swedish', spanisch: 'Spanish', turkisch: 'Turkish', ukrainisch: 'Ukrainian', ungarisch: 'Hungarian', vietnamesisch: 'Vietnamese'
};

export function normalizeMetricLabel(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[–—]/g, '-')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

export function splitLegacyMetricName(name: string): { reportLabel: string; seriesLabel: string | null } {
	const separator = name.indexOf(': ');
	if (separator === -1) return { reportLabel: name.trim(), seriesLabel: null };
	return {
		reportLabel: name.slice(0, separator).trim(),
		seriesLabel: name.slice(separator + 2).trim() || null
	};
}

export function classifyChromeReportLabel(label: string): ChromeReportClassification | null {
	const normalized = normalizeMetricLabel(label);
	for (const candidate of CHROME_REPORT_PATTERNS) {
		if (candidate.patterns.some((pattern) => normalized.includes(normalizeMetricLabel(pattern)))) {
			return { ...candidate.report } as ChromeReportClassification;
		}
	}
	return null;
}

export function classifyChromeReportFilename(filename: string): ChromeReportClassification | null {
	const label = filename
		.replace(/\.[^.]+$/, '')
		.replace(/_[a-z0-9]{32}$/i, '')
		.trim();
	return classifyChromeReportLabel(label);
}

export function displayDimensionLabel(value: string): string {
	return DIMENSION_LABELS[normalizeMetricLabel(value)] ?? value;
}

function observationIsNewer(candidate: DashboardObservation, current: DashboardObservation): boolean {
	const candidateCompleted = candidate.completedAt ?? 0;
	const currentCompleted = current.completedAt ?? 0;
	if (candidateCompleted !== currentCompleted) return candidateCompleted > currentCompleted;
	return (candidate.observationId ?? '') > (current.observationId ?? '');
}

function dimensionValue(observation: DashboardObservation, preferredKey: string): string | null {
	if (observation.dimensions?.[preferredKey]) return observation.dimensions[preferredKey];
	const values = Object.values(observation.dimensions ?? {}).filter(Boolean);
	return values[0] ?? null;
}

export function buildBreakdownGroups(metrics: DashboardMetric[]): BreakdownGroup[] {
	type MutableGroup = BreakdownGroup & { seriesMaps: Map<string, Map<string, DashboardObservation>> };
	const groups = new Map<string, MutableGroup>();

	for (const metric of metrics) {
		if (metric.metricType !== 'custom') continue;
		const legacy = splitLegacyMetricName(metric.name);
		const classification = classifyChromeReportLabel(legacy.reportLabel);
		if (!classification) continue;
		const key = `${metric.sourceId ?? metric.sourceName}:${classification.id}`;
		let group = groups.get(key);
		if (!group) {
			group = { ...classification, key, sourceName: metric.sourceName, series: [], seriesMaps: new Map() };
			groups.set(key, group);
		}

		for (const observation of metric.observations) {
			const seriesName = displayDimensionLabel(dimensionValue(observation, classification.dimensionKey) ?? legacy.seriesLabel ?? metric.name);
			if (!group.seriesMaps.has(seriesName)) group.seriesMaps.set(seriesName, new Map());
			const byDate = group.seriesMaps.get(seriesName)!;
			const current = byDate.get(observation.date);
			if (!current || observationIsNewer(observation, current)) byDate.set(observation.date, observation);
		}
	}

	return [...groups.values()]
		.map(({ seriesMaps, ...group }) => ({
			...group,
			series: [...seriesMaps.entries()].map(([name, observations]) => ({
				name,
				observations: [...observations.values()].sort((a, b) => a.date.localeCompare(b.date))
			}))
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
}

function rangeStart(endDate: string, days: number): string {
	const end = new Date(`${endDate}T00:00:00Z`);
	end.setUTCDate(end.getUTCDate() - days + 1);
	return end.toISOString().slice(0, 10);
}

export function filterObservationsByCalendarDays(observations: DashboardObservation[], days: number | null): DashboardObservation[] {
	if (days === null || observations.length === 0) return observations;
	const endDate = observations.reduce((latest, observation) => observation.date > latest ? observation.date : latest, observations[0].date);
	const startDate = rangeStart(endDate, days);
	return observations.filter((observation) => observation.date >= startDate && observation.date <= endDate);
}

export function calculateBreakdownRows(group: BreakdownGroup, days: number | null): BreakdownRow[] {
	const groupEndDate = group.series.flatMap((series) => series.observations).reduce<string | null>(
		(latest, observation) => latest === null || observation.date > latest ? observation.date : latest,
		null
	);
	if (!groupEndDate) return [];
	const startDate = days === null ? null : rangeStart(groupEndDate, days);

	const rows = group.series.map((series) => {
		const eligible = series.observations.filter((observation) => observation.date <= groupEndDate && (!startDate || observation.date >= startDate));
		if (group.semantics === 'snapshot') {
			const latest = eligible.at(-1) ?? series.observations.filter((observation) => observation.date <= groupEndDate).at(-1);
			return { name: series.name, value: latest?.value ?? 0, share: 0, date: latest?.date ?? null };
		}
		return {
			name: series.name,
			value: eligible.reduce((sum, observation) => sum + observation.value, 0),
			share: 0,
			date: eligible.at(-1)?.date ?? null
		};
	});

	const total = rows.reduce((sum, row) => sum + row.value, 0);
	return rows
		.map((row) => ({ ...row, share: total > 0 ? row.value / total : 0 }))
		.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export function calculateBreakdownTimeline(group: BreakdownGroup, days: number | null): BreakdownTimeline {
	const groupEndDate = group.series.flatMap((series) => series.observations).reduce<string | null>(
		(latest, observation) => latest === null || observation.date > latest ? observation.date : latest,
		null
	);
	if (!groupEndDate) return { dates: [], series: [] };
	const startDate = days === null ? null : rangeStart(groupEndDate, days);
	const dates = [...new Set(group.series
		.flatMap((series) => series.observations)
		.filter((observation) => observation.date <= groupEndDate && (!startDate || observation.date >= startDate))
		.map((observation) => observation.date))]
		.sort();

	return {
		dates,
		series: group.series.map((series) => {
			const valuesByDate = new Map(series.observations.map((observation) => [observation.date, observation.value]));
			return {
				name: series.name,
				observations: dates.map((date) => ({ date, value: valuesByDate.get(date) ?? 0 }))
			};
		})
	};
}

export function dashboardPeriodKey(days: number | null): DashboardPeriodKey {
	return days === null ? '365' : String(days) as DashboardPeriodKey;
}

export function summarizeBreakdownGroups(groups: BreakdownGroup[]): BreakdownSummaryGroup[] {
	return groups.map(({ series, ...group }) => {
		const sourceGroup = { ...group, series };
		return {
			...group,
			periodRows: Object.fromEntries(DASHBOARD_PERIODS.map((days) => [
				dashboardPeriodKey(days),
				calculateBreakdownRows(sourceGroup, days)
			])) as Record<DashboardPeriodKey, BreakdownRow[]>,
			timeline: group.id === 'ratings' ? calculateBreakdownTimeline(sourceGroup, null) : null
		};
	});
}

export function filterBreakdownTimeline(timeline: BreakdownTimeline | null, days: number | null): BreakdownTimeline {
	if (!timeline || days === null || timeline.dates.length === 0) return timeline ?? { dates: [], series: [] };
	const startDate = rangeStart(timeline.dates.at(-1)!, days);
	const firstIndex = timeline.dates.findIndex((date) => date >= startDate);
	if (firstIndex === -1) return { dates: [], series: [] };
	return {
		dates: timeline.dates.slice(firstIndex),
		series: timeline.series.map((series) => ({ ...series, observations: series.observations.slice(firstIndex) }))
	};
}

export function metricDisplayValue(metric: DashboardMetric, days: number | null): number | null {
	const observations = filterObservationsByCalendarDays(metric.observations, days);
	if (observations.length === 0) return null;
	if (metric.metricType === 'active_users' || metric.aggregation === 'latest') return observations.at(-1)!.value;
	if (metric.aggregation === 'average') return observations.reduce((sum, observation) => sum + observation.value, 0) / observations.length;
	if (metric.aggregation === 'minimum') return Math.min(...observations.map((observation) => observation.value));
	if (metric.aggregation === 'maximum') return Math.max(...observations.map((observation) => observation.value));
	return observations.reduce((sum, observation) => sum + observation.value, 0);
}

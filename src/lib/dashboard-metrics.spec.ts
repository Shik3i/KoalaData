import { describe, expect, it } from 'vitest';
import {
	buildBreakdownGroups,
	calculateBreakdownRows,
	calculateBreakdownTimeline,
	classifyChromeReportFilename,
	filterObservationsByCalendarDays,
	summarizeBreakdownGroups,
	type DashboardMetric
} from './dashboard-metrics';

describe('dashboard metric semantics', () => {
	it('classifies localized Chrome Web Store report filenames', () => {
		expect(classifyChromeReportFilename('Installationen nach Region.csv')).toMatchObject({ id: 'installs-region', semantics: 'flow' });
		expect(classifyChromeReportFilename('Wöchentliche Nutzer nach Region.csv')).toMatchObject({ id: 'weekly-users-region', semantics: 'snapshot' });
		expect(classifyChromeReportFilename('Enabled vs Disabled.csv')).toMatchObject({ id: 'enabled-state', semantics: 'snapshot' });
		expect(classifyChromeReportFilename('Bewertungen im Zeitverlauf.csv')).toMatchObject({ id: 'ratings', semantics: 'flow' });
		expect(classifyChromeReportFilename('Installations par région.csv')).toMatchObject({ id: 'installs-region', semantics: 'flow' });
		expect(classifyChromeReportFilename('Instalaciones por idioma.csv')).toMatchObject({ id: 'installs-language', semantics: 'flow' });
		expect(classifyChromeReportFilename('Instalações por sistema operacional.csv')).toMatchObject({ id: 'installs-os', semantics: 'flow' });
		expect(classifyChromeReportFilename('Użytkownicy tygodniowi według region.csv')).toMatchObject({ id: 'weekly-users-region', semantics: 'snapshot' });
		expect(classifyChromeReportFilename('Tägliche Nutzer nach Erweiterungsversion.csv')).toMatchObject({ id: 'users-version', semantics: 'snapshot' });
	});

	it('groups every extension version into one snapshot breakdown', () => {
		const groups = buildBreakdownGroups([
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'v1', metricType: 'custom',
				name: 'Tägliche Nutzer nach Erweiterungsversion: 2.5.0.0', aggregation: 'sum',
				observations: [{ date: '2026-07-20', value: 624 }]
			},
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'v2', metricType: 'custom',
				name: 'Tägliche Nutzer nach Erweiterungsversion: 2.5.4.0', aggregation: 'sum',
				observations: [{ date: '2026-07-20', value: 1767 }]
			}
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({ id: 'users-version', title: 'Users by Extension Version' });
		expect(calculateBreakdownRows(groups[0], 90).map((row) => [row.name, row.value])).toEqual([
			['2.5.4.0', 1767],
			['2.5.0.0', 624]
		]);
	});

	it('groups legacy metric definitions without dropping a series', () => {
		const metrics: DashboardMetric[] = [
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'de', metricType: 'custom',
				name: 'Installationen nach Region: Deutschland', aggregation: 'sum',
				observations: [{ date: '2026-07-01', value: 2 }, { date: '2026-07-02', value: 3 }]
			},
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'fr', metricType: 'custom',
				name: 'Installationen nach Region: Frankreich', aggregation: 'sum',
				observations: [{ date: '2026-07-01', value: 1 }]
			}
		];
		const groups = buildBreakdownGroups(metrics);
		expect(groups).toHaveLength(1);
		expect(groups[0].series.map((series) => series.name)).toEqual(['Germany', 'France']);
		expect(calculateBreakdownRows(groups[0], null).map((row) => [row.name, row.value])).toEqual([
			['Germany', 5], ['France', 1]
		]);
	});

	it('uses the latest snapshot instead of summing daily stock values', () => {
		const group = buildBreakdownGroups([{
			sourceId: 'source', sourceName: 'CWS', metricId: 'enabled', metricType: 'custom',
			name: 'Aktiviert im Vergleich zu deaktiviert: Aktiviert', aggregation: 'sum',
			observations: [{ date: '2026-07-01', value: 500 }, { date: '2026-07-02', value: 520 }]
		}])[0];
		expect(calculateBreakdownRows(group, 90)[0].value).toBe(520);
	});

	it('sums daily ratings and preserves zero days in the timeline', () => {
		const group = buildBreakdownGroups([
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'five-stars', metricType: 'custom',
				name: 'Bewertungen im Zeitverlauf: Fünf Sterne', aggregation: 'sum',
				observations: [
					{ date: '2026-06-08', value: 1 },
					{ date: '2026-06-09', value: 2 },
					{ date: '2026-06-10', value: 0 }
				]
			},
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'one-star', metricType: 'custom',
				name: 'Bewertungen im Zeitverlauf: Ein Stern', aggregation: 'sum',
				observations: [
					{ date: '2026-06-08', value: 0 },
					{ date: '2026-06-09', value: 1 },
					{ date: '2026-06-10', value: 0 }
				]
			}
		])[0];

		expect(calculateBreakdownRows(group, 90).map((row) => [row.name, row.value])).toEqual([
			['5 stars', 3], ['1 star', 1]
		]);
		expect(calculateBreakdownTimeline(group, 90)).toMatchObject({
			dates: ['2026-06-08', '2026-06-09', '2026-06-10'],
			series: [
				{ name: '5 stars', observations: [{ value: 1 }, { value: 2 }, { value: 0 }] },
				{ name: '1 star', observations: [{ value: 0 }, { value: 1 }, { value: 0 }] }
			]
		});
	});

	it('merges legacy and dimensional observations without double counting overlaps', () => {
		const group = buildBreakdownGroups([
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'legacy', metricType: 'custom',
				name: 'Installationen nach Region: Deutschland', aggregation: 'sum',
				observations: [{ date: '2026-07-01', value: 2, completedAt: 10, observationId: 'old' }]
			},
			{
				sourceId: 'source', sourceName: 'CWS', metricId: 'dimensional', metricType: 'custom',
				name: 'Installationen nach Region', aggregation: 'sum',
				observations: [{ date: '2026-07-01', value: 5, dimensions: { region: 'Germany' }, completedAt: 20, observationId: 'new' }]
			}
		])[0];
		expect(calculateBreakdownRows(group, null)).toMatchObject([{ name: 'Germany', value: 5 }]);
	});

	it('filters by calendar date instead of observation count', () => {
		const observations = [
			{ date: '2026-06-01', value: 1 },
			{ date: '2026-07-01', value: 2 },
			{ date: '2026-07-02', value: 3 }
		];
		expect(filterObservationsByCalendarDays(observations, 7).map((observation) => observation.value)).toEqual([2, 3]);
	});

	it('materializes fixed dashboard periods without serializing raw breakdown observations', () => {
		const metrics = Array.from({ length: 40 }, (_, metricIndex): DashboardMetric => ({
			sourceId: 'source',
			sourceName: 'CWS',
			metricId: `version-${metricIndex}`,
			metricType: 'custom',
			name: `Tägliche Nutzer nach Erweiterungsversion: 2.5.${metricIndex}.0`,
			aggregation: 'sum',
			observations: Array.from({ length: 235 }, (_, day) => ({
				date: new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10),
				value: metricIndex + day
			}))
		}));
		const summaries = summarizeBreakdownGroups(buildBreakdownGroups(metrics));

		expect(summaries).toHaveLength(1);
		expect(summaries[0].id).toBe('users-version');
		expect(summaries[0].periodRows['90']).toHaveLength(40);
		expect(summaries[0]).not.toHaveProperty('series');
		expect(JSON.stringify(summaries).length).toBeLessThan(30_000);
	});
});

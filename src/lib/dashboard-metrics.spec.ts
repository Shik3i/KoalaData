import { describe, expect, it } from 'vitest';
import {
	buildBreakdownGroups,
	calculateBreakdownRows,
	classifyChromeReportFilename,
	filterObservationsByCalendarDays,
	type DashboardMetric
} from './dashboard-metrics';

describe('dashboard metric semantics', () => {
	it('classifies localized Chrome Web Store report filenames', () => {
		expect(classifyChromeReportFilename('Installationen nach Region.csv')).toMatchObject({ id: 'installs-region', semantics: 'flow' });
		expect(classifyChromeReportFilename('Wöchentliche Nutzer nach Region.csv')).toMatchObject({ id: 'weekly-users-region', semantics: 'snapshot' });
		expect(classifyChromeReportFilename('Enabled vs Disabled.csv')).toMatchObject({ id: 'enabled-state', semantics: 'snapshot' });
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
});

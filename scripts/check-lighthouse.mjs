import { readFile } from 'node:fs/promises';

const reportPaths = process.argv.slice(2);
if (reportPaths.length === 0) reportPaths.push('test-results/lighthouse.json');
const reports = await Promise.all(reportPaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
const minimumScores = {
	performance: 0.9,
	accessibility: 1,
	'best-practices': 1,
	seo: 1
};

function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

const scores = Object.fromEntries(
	Object.keys(minimumScores).map((category) => [
		category,
		median(reports.map((report) => report.categories[category]?.score ?? 0))
	])
);

const failures = [];
for (const [category, minimum] of Object.entries(minimumScores)) {
	const actual = scores[category];
	if (actual < minimum) failures.push(`${category}: ${Math.round(actual * 100)} < ${Math.round(minimum * 100)}`);
}

const metrics = {
	fcp: median(reports.map((report) => report.audits['first-contentful-paint'].numericValue)),
	lcp: median(reports.map((report) => report.audits['largest-contentful-paint'].numericValue)),
	tbt: median(reports.map((report) => report.audits['total-blocking-time'].numericValue)),
	cls: median(reports.map((report) => report.audits['cumulative-layout-shift'].numericValue))
};
if (metrics.lcp > 2500) failures.push(`LCP: ${metrics.lcp}ms > 2500ms`);
if (metrics.tbt > 200) failures.push(`TBT: ${metrics.tbt}ms > 200ms`);
if (metrics.cls > 0.1) failures.push(`CLS: ${metrics.cls} > 0.1`);

console.log(JSON.stringify({
	runs: reports.length,
	scores: Object.fromEntries(Object.entries(scores).map(([category, score]) => [category, Math.round(score * 100)])),
	metrics
}, null, 2));

if (failures.length) {
	const failedAudits = new Map();
	for (const report of reports) {
		for (const category of Object.keys(minimumScores)) {
			if (scores[category] >= minimumScores[category]) continue;
			for (const reference of report.categories[category]?.auditRefs ?? []) {
				const audit = report.audits[reference.id];
				if (reference.weight === 0 || audit?.score == null || audit.score >= 1) continue;
				failedAudits.set(reference.id, `${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`);
			}
		}
	}
	console.error(`Lighthouse budget failed:\n${failures.join('\n')}`);
	if (failedAudits.size > 0) console.error(`Failed audits:\n${[...failedAudits.values()].join('\n')}`);
	process.exit(1);
}

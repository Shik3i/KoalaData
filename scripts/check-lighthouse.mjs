import { readFile } from 'node:fs/promises';

const reportPath = process.argv[2] || 'test-results/lighthouse.json';
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const minimumScores = {
	performance: 0.9,
	accessibility: 1,
	'best-practices': 1,
	seo: 1
};

const failures = [];
for (const [category, minimum] of Object.entries(minimumScores)) {
	const actual = report.categories[category]?.score ?? 0;
	if (actual < minimum) failures.push(`${category}: ${Math.round(actual * 100)} < ${Math.round(minimum * 100)}`);
}

const metrics = {
	fcp: report.audits['first-contentful-paint'].numericValue,
	lcp: report.audits['largest-contentful-paint'].numericValue,
	tbt: report.audits['total-blocking-time'].numericValue,
	cls: report.audits['cumulative-layout-shift'].numericValue
};
if (metrics.lcp > 2500) failures.push(`LCP: ${metrics.lcp}ms > 2500ms`);
if (metrics.tbt > 200) failures.push(`TBT: ${metrics.tbt}ms > 200ms`);
if (metrics.cls > 0.1) failures.push(`CLS: ${metrics.cls} > 0.1`);

console.log(JSON.stringify({
	scores: Object.fromEntries(Object.keys(minimumScores).map((category) => [category, Math.round(report.categories[category].score * 100)])),
	metrics
}, null, 2));

if (failures.length) {
	console.error(`Lighthouse budget failed:\n${failures.join('\n')}`);
	process.exit(1);
}

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { EChartsType } from 'echarts/core';
	import { computeLinearForecast, computeMovingAverage } from '$lib/chart-utils';

	type Observation = { date: string; value: number };
	type SeriesData = {
		name: string;
		color: string;
		observations: Observation[];
	};

	let { title, observations, seriesList, categoryLabels, showMovingAverage = false, showForecast = false } = $props<{
		title?: string;
		observations?: Observation[];
		seriesList?: SeriesData[];
		categoryLabels?: string[];
		showMovingAverage?: boolean;
		showForecast?: boolean;
	}>();

	let exporting = $state(false);
	let chartReady = $state(false);
	let chartError = $state(false);
	let initGeneration = 0;

	function csvCell(value: string | number): string {
		const text = String(value);
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function exportPNG() {
		if (!chart) return;
		exporting = true;
		try {
			const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
			const link = document.createElement('a');
			link.href = url;
			link.download = `${title || 'chart'}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} finally {
			exporting = false;
		}
	}

	function exportCSV() {
		exporting = true;
		try {
			let csv = '';
			if (seriesList && seriesList.length > 0) {
				const headers = ['Date', ...seriesList.map((s: SeriesData) => s.name)];
				csv = headers.map(csvCell).join(',') + '\n';
				const maxLen = Math.max(...seriesList.map((s: SeriesData) => s.observations.length));
				for (let i = 0; i < maxLen; i++) {
					const date = seriesList[0].observations[i]?.date ?? '';
					const row = [date, ...seriesList.map((s: SeriesData) => s.observations[i]?.value ?? '')];
					csv += row.map(csvCell).join(',') + '\n';
				}
			} else if (observations) {
				csv = 'Date,Value\n';
				for (const o of observations) {
					csv += `${csvCell(o.date)},${csvCell(o.value)}\n`;
				}
			} else {
				return;
			}
			const blob = new Blob([csv], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${title || 'chart'}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} finally {
			exporting = false;
		}
	}

	let chartDom: HTMLDivElement;
	let chart: EChartsType | null = null;
	let destroyed = false;

	async function initChart() {
		const generation = ++initGeneration;
		chartReady = false;
		chartError = false;
		if (!chartDom) return;

		try {
			const { echarts } = await import('$lib/chart-runtime');
			if (destroyed || generation !== initGeneration || !chartDom.isConnected) return;

			if (chart) {
				chart.dispose();
				chart = null;
			}

			chart = echarts.init(chartDom, undefined, { renderer: 'svg' });

			const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

			let dates: string[] = categoryLabels?.length ? [...categoryLabels] : [];
			let seriesOptions: any[] = [];

			if (seriesList && seriesList.length > 0) {
				if (!dates.length) dates = seriesList[0].observations.map((o: Observation) => o.date);
				seriesOptions = seriesList.flatMap((s: SeriesData) => {
					const values = s.observations.map((o: Observation) => o.value);
					const result: any[] = [{
						name: s.name,
						data: values,
						type: 'line',
						smooth: true,
						symbol: 'circle',
						symbolSize: 5,
						color: s.color,
						lineStyle: { width: 2.5 },
						areaStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: s.color + '1A' },
								{ offset: 1, color: s.color + '00' }
							])
						}
					}];
					if (showMovingAverage && values.length >= 7) {
						result.push({
							name: `${s.name} · 7-day average`,
							data: computeMovingAverage(values),
							type: 'line',
							smooth: true,
							symbol: 'none',
							symbolSize: 0,
							color: s.color,
							lineStyle: { width: 2, type: 'dashed' },
							areaStyle: undefined
						});
					}
					return result;
				});
			} else if (observations) {
				if (!dates.length) dates = observations.map((o: Observation) => o.date);
			const values = observations.map((o: Observation) => o.value);
			const mainColor = isDark ? '#78d397' : '#2f6d47';

			seriesOptions = [
				{
					name: 'Actual',
					data: [...values],
					type: 'line',
					smooth: true,
					symbol: 'circle',
					symbolSize: 5,
					color: mainColor,
					lineStyle: { width: 2.5 },
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, isDark ? [
							{ offset: 0, color: 'rgba(120, 211, 151, 0.25)' },
							{ offset: 1, color: 'rgba(120, 211, 151, 0.0)' }
						] : [
							{ offset: 0, color: 'rgba(47, 109, 71, 0.25)' },
							{ offset: 1, color: 'rgba(47, 109, 71, 0.0)' }
						])
					}
				}
			];

			if (showMovingAverage && values.length >= 7) {
				const sma = computeMovingAverage(values);
				seriesOptions.push({
					name: '7-Day Avg',
					data: sma,
					type: 'line',
					smooth: true,
					symbol: 'none',
					lineStyle: { width: 2, type: 'dashed' },
					color: isDark ? '#788b82' : '#94a3b8',
				});
			}

			if (showForecast && values.length >= 5) {
				const forecast = computeLinearForecast(values, 30);
				if (forecast) {
					const lastDate = new Date(dates[dates.length - 1]);
					const forecastDates: string[] = [];
					for (let i = 1; i <= 30; i++) {
						const d = new Date(lastDate);
						d.setDate(d.getDate() + i);
						forecastDates.push(d.toISOString().split('T')[0]);
					}
					dates = [...dates, ...forecastDates];

					for (const s of seriesOptions) {
						s.data = [...s.data, ...new Array(30).fill(null)];
					}

					const forecastData = new Array(values.length - 1).fill(null);
					forecastData.push(values[values.length - 1]);
					forecastData.push(...forecast);

					seriesOptions.push({
						name: '30-Day Forecast (estimate)',
						data: forecastData,
						type: 'line',
						smooth: true,
						symbol: 'none',
						lineStyle: { width: 2, type: 'dotted' },
						color: mainColor,
					});
				}
			}
			}

		const hasZoom = dates.length > 14;
		const hasZoomSlider = dates.length > 30;
		const legendData = seriesOptions.map((s: any) => s.name);
		const hasLegend = legendData.length > 1;

		const option = {
			grid: {
				left: '4%',
				right: '4%',
				bottom: hasZoomSlider ? '16%' : '8%',
				top: hasLegend ? '14%' : '6%',
			},
			legend: hasLegend ? {
				data: legendData,
				top: 0,
				right: 0,
				textStyle: {
					color: isDark ? '#a5b2a8' : '#64748b',
					fontFamily: 'Inter, system-ui, sans-serif',
					fontSize: 11
				}
			} : undefined,
			tooltip: {
				trigger: 'axis',
				backgroundColor: isDark ? '#151c17' : 'rgba(255, 255, 255, 0.95)',
				borderWidth: 1,
				borderColor: isDark ? '#2a382e' : '#e2e8f0',
				textStyle: {
					color: isDark ? '#edf5ef' : '#1e293b',
					fontSize: 12
				}
			},
			xAxis: {
				type: 'category',
				data: dates,
				axisLabel: {
					rotate: 0,
					fontSize: 10,
					color: isDark ? '#a5b2a8' : '#64748b',
					margin: 10,
					hideOverlap: true,
					formatter: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5) : value
				},
				axisLine: {
					lineStyle: {
						color: isDark ? '#2a382e' : '#e2e8f0'
					}
				},
				axisTick: {
					alignWithLabel: true
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					color: isDark ? '#a5b2a8' : '#64748b',
					fontSize: 10
				},
				splitLine: {
					lineStyle: {
						color: isDark ? '#2a382e' : '#f1f5f9'
					}
				}
			},
			dataZoom: hasZoom ? [
				{
					type: 'inside',
					start: 0,
					end: 100
				},
				...(hasZoomSlider ? [{
					type: 'slider',
					bottom: '1%',
					height: 14,
					borderColor: 'transparent',
					fillerColor: isDark ? 'rgba(120, 211, 151, 0.12)' : 'rgba(47, 109, 71, 0.1)',
					handleSize: '90%',
					handleStyle: {
						color: isDark ? '#78d397' : '#2f6d47',
					},
					textStyle: {
						color: isDark ? '#a5b2a8' : '#64748b',
						fontSize: 10
					}
				}] : [])
			] : undefined,
			series: seriesOptions
		};

			chart.setOption(option);
			if (generation === initGeneration) chartReady = true;
		} catch (error) {
			if (generation === initGeneration && !destroyed) {
				chartError = true;
				console.error('[MetricChart] Failed to render chart:', error);
			}
		}
	}

	$effect(() => {
		if (observations || seriesList) {
			void categoryLabels;
			void showMovingAverage;
			void showForecast;
			void initChart();
		}
	});

	onMount(() => {
		void initChart();
		const handleResize = () => {
			chart?.resize();
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		destroyed = true;
		if (chart) {
			chart.dispose();
		}
	});
</script>

<div class="chart-container-wrapper">
	<div class="chart-export-buttons" aria-label="Chart exports">
		<button class="export-btn" onclick={exportPNG} disabled={exporting} title="Download PNG" aria-label="Download chart as PNG">PNG</button>
		<button class="export-btn" onclick={exportCSV} disabled={exporting} title="Download CSV" aria-label="Download chart data as CSV">CSV</button>
	</div>
	<div bind:this={chartDom} class="chart-dom" aria-busy={!chartReady && !chartError}></div>
	{#if !chartReady}
		<div class="chart-status" role="status">
			{chartError ? 'Chart could not be rendered.' : 'Loading chart…'}
		</div>
	{/if}
</div>

<style>
	.chart-container-wrapper {
		width: 100%;
		height: clamp(320px, 34vw, 400px);
		position: relative;
	}

	@media (max-width: 520px) {
		.chart-container-wrapper { height: 300px; }
	}

	.chart-dom {
		width: 100%;
		height: 100%;
	}

	.chart-export-buttons {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s ease;
		z-index: 10;
	}
	.chart-container-wrapper:hover .chart-export-buttons {
		opacity: 1;
	}
	.chart-container-wrapper:focus-within .chart-export-buttons {
		opacity: 1;
	}
	.chart-status {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		color: var(--text-muted);
		font-size: 0.85rem;
		pointer-events: none;
	}
	.export-btn {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background-color: var(--bg-surface);
		color: var(--text-muted);
		cursor: pointer;
		transition: var(--transition-base);
		line-height: 1.2;
	}
	.export-btn:hover {
		background-color: var(--bg-inset);
		color: var(--text-base);
	}
	.export-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>

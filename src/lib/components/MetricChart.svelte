<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { EChartsType } from 'echarts/core';

	type Observation = { date: string; value: number };
	type SeriesData = {
		name: string;
		color: string;
		observations: Observation[];
	};

	let { title, observations, seriesList } = $props<{
		title: string;
		observations?: Observation[];
		seriesList?: SeriesData[];
	}>();

	let chartDom: HTMLDivElement;
	let chart: EChartsType | null = null;
	let destroyed = false;

	async function initChart() {
		if (!chartDom) return;

		const { echarts } = await import('$lib/chart-runtime');
		if (destroyed || !chartDom.isConnected) return;

		if (chart) {
			chart.dispose();
			chart = null;
		}

		chart = echarts.init(chartDom, undefined, { renderer: 'svg' });

		const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

		let dates: string[] = [];
		let seriesOptions: any[] = [];

		if (seriesList && seriesList.length > 0) {
			// Extract dates from the first series
			dates = seriesList[0].observations.map((o: Observation) => o.date);
			seriesOptions = seriesList.map((s: SeriesData) => ({
				name: s.name,
				data: s.observations.map((o: Observation) => o.value),
				type: 'line',
				smooth: true,
				symbol: 'circle',
				symbolSize: 6,
				color: s.color,
				lineStyle: {
					width: 3
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: s.color + '26' }, // ~15% opacity
						{ offset: 1, color: s.color + '00' }  // 0% opacity
					])
				}
			}));
		} else if (observations) {
			dates = observations.map((o: Observation) => o.date);
			const values = observations.map((o: Observation) => o.value);
			seriesOptions = [
				{
					data: values,
					type: 'line',
					smooth: true,
					symbol: 'circle',
					symbolSize: 6,
					color: isDark ? '#78d397' : '#2f6d47',
					lineStyle: {
						width: 3
					},
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, isDark ? [
							{ offset: 0, color: 'rgba(120, 211, 151, 0.3)' },
							{ offset: 1, color: 'rgba(120, 211, 151, 0.0)' }
						] : [
							{ offset: 0, color: 'rgba(47, 109, 71, 0.3)' },
							{ offset: 1, color: 'rgba(47, 109, 71, 0.0)' }
						])
					}
				}
			];
		}

		const hasZoom = dates.length > 14;

		const option = {
			title: {
				text: title,
				left: 'center',
				textStyle: {
					fontFamily: 'Outfit, Inter, system-ui, sans-serif',
					fontSize: 15,
					fontWeight: 600,
					color: isDark ? '#edf5ef' : '#2e3d30'
				}
			},
			legend: (seriesList && seriesList.length > 0) ? {
				data: seriesList.map((s: SeriesData) => s.name),
				top: '8%',
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
					color: isDark ? '#edf5ef' : '#1e293b'
				}
			},
			grid: {
				left: '8%',
				right: '5%',
				bottom: hasZoom ? '20%' : '12%',
				top: (seriesList && seriesList.length > 0) ? '22%' : '18%',
			},
			xAxis: {
				type: 'category',
				data: dates,
				axisLabel: {
					rotate: 35,
					fontSize: 10,
					color: isDark ? '#a5b2a8' : '#64748b'
				},
				axisLine: {
					lineStyle: {
						color: isDark ? '#2a382e' : '#e2e8f0'
					}
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					color: isDark ? '#a5b2a8' : '#64748b'
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
				{
					type: 'slider',
					bottom: '2%',
					height: 18,
					borderColor: 'transparent',
					fillerColor: isDark ? 'rgba(120, 211, 151, 0.15)' : 'rgba(47, 109, 71, 0.12)',
					handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
					handleSize: '120%',
					handleStyle: {
						color: isDark ? '#78d397' : '#2f6d47',
						shadowBlur: 3,
						shadowColor: 'rgba(0, 0, 0, 0.3)'
					},
					textStyle: {
						color: isDark ? '#a5b2a8' : '#64748b',
						fontSize: 10
					}
				}
			] : undefined,
			series: seriesOptions
		};

		chart.setOption(option);
	}

	// Update chart when observations or seriesList changes reactively
	$effect(() => {
		if (observations || seriesList) {
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
	<div bind:this={chartDom} class="chart-dom"></div>
</div>

<style>
	.chart-container-wrapper {
		width: 100%;
		height: 350px;
		margin-top: 1rem;
		position: relative;
	}

	.chart-dom {
		width: 100%;
		height: 100%;
	}
</style>

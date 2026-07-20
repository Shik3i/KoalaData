<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { EChartsType } from 'echarts/core';

	type Observation = { date: string; value: number };

	let { title, observations } = $props<{
		title: string;
		observations: Observation[];
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
		}

		chart = echarts.init(chartDom, undefined, { renderer: 'svg' });

		const dates = observations.map((o: Observation) => o.date);
		const values = observations.map((o: Observation) => o.value);

		const option = {
			title: {
				text: title,
				left: 'center',
				textStyle: {
					fontFamily: 'Outfit, Inter, system-ui, sans-serif',
					fontSize: 15,
					fontWeight: 600,
					color: '#2e3d30'
				}
			},
			tooltip: {
				trigger: 'axis',
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				borderWidth: 1,
				borderColor: '#e2e8f0',
				textStyle: {
					color: '#1e293b'
				}
			},
			grid: {
				left: '8%',
				right: '5%',
				bottom: '12%',
				top: '18%',
			},
			xAxis: {
				type: 'category',
				data: dates,
				axisLabel: {
					rotate: 35,
					fontSize: 10,
					color: '#64748b'
				},
				axisLine: {
					lineStyle: {
						color: '#e2e8f0'
					}
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					color: '#64748b'
				},
				splitLine: {
					lineStyle: {
						color: '#f1f5f9'
					}
				}
			},
			series: [
				{
					data: values,
					type: 'line',
					smooth: true,
					symbol: 'circle',
					symbolSize: 6,
					color: '#556b2f',
					lineStyle: {
						width: 3
					},
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: 'rgba(85, 107, 47, 0.35)' },
							{ offset: 1, color: 'rgba(85, 107, 47, 0.0)' }
						])
					}
				}
			]
		};

		chart.setOption(option);
	}

	// Update chart when observations list changes reactively
	$effect(() => {
		if (observations) {
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

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { EChartsType } from 'echarts/core';
	import { chartDataZoom, computeLinearForecast, computeMovingAverage, prepareChartData } from '$lib/chart-utils';
	import ChartShareModal from '$lib/components/ChartShareModal.svelte';
	import {
		chartExportSlug,
		compactChartNumber,
		resolveChartExportSize,
		revealChartValues,
		type ChartExportOptions
	} from '$lib/chart-export';

	type Observation = { date: string; value: number };
	type SeriesData = {
		name: string;
		color: string;
		observations: Observation[];
	};

	type ReleaseMarker = { date: string; version: string };
	type ProjectEventItem = {
		id: string;
		date: string;
		title: string;
		description?: string | null;
		category?: string;
		icon?: string | null;
		impact?: { status: string; summaryText: string; percentChange: number | null } | null;
	};

	let {
		title,
		observations,
		seriesList,
		categoryLabels,
		exportHeading,
		exportSubtitle,
		exportValue,
		exportDelta,
		exportInsight,
		exportProjectName,
		exportProjectDescription,
		exportLogoUrl,
		exportTimeframe,
		exportDataDate,
		exportShareUrl,
		allowMovingAverageExport = false,
		showMovingAverage = false,
		showForecast = false,
		releaseMarkers = [],
		projectEvents = []
	} = $props<{
		title?: string;
		observations?: Observation[];
		seriesList?: SeriesData[];
		categoryLabels?: string[];
		exportHeading?: string;
		exportSubtitle?: string;
		exportValue?: string;
		exportDelta?: string;
		exportInsight?: string;
		exportProjectName?: string;
		exportProjectDescription?: string;
		exportLogoUrl?: string;
		exportTimeframe?: string;
		exportDataDate?: string;
		exportShareUrl?: string;
		allowMovingAverageExport?: boolean;
		showMovingAverage?: boolean;
		showForecast?: boolean;
		releaseMarkers?: ReleaseMarker[];
		projectEvents?: ProjectEventItem[];
	}>();

	let exporting = $state(false);
	let showReleaseMarkers = $state(false);
	let showProjectEvents = $state(true);
	let chartReady = $state(false);
	let chartError = $state(false);
	let hasData = $state(true);
	let chartStartLabel = $state('');
	let shareModalOpen = $state(false);
	let initGeneration = 0;
	let cachedLogoImage: HTMLImageElement | null | undefined;
	let movingAverageExportAvailable = $derived.by(() => {
		if (!allowMovingAverageExport && !showMovingAverage) return false;
		const lengths: number[] = seriesList?.length
			? seriesList.map((series: SeriesData) => series.observations.length)
			: [observations?.length ?? 0];
		return lengths.some((length: number) => length >= 7);
	});

	function csvCell(value: string | number): string {
		const text = String(value);
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function escapeHtml(text: string): string {
		return text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename.replace(/[<>:"/\\|?*]/g, '-');
		document.body.appendChild(link);
		link.click();
		window.setTimeout(() => {
			link.remove();
			URL.revokeObjectURL(url);
		}, 1_000);
	}

	function loadImage(source: string): Promise<HTMLImageElement> {
		const image = new Image();
		image.decoding = 'async';
		return new Promise<HTMLImageElement>((resolve, reject) => {
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('Could not decode the chart SVG.'));
			image.src = source;
		});
	}

	function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
		return new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) resolve(blob);
				else reject(new Error(`Could not encode the chart as ${type}.`));
			}, type);
		});
	}

	function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
		if (context.measureText(text).width <= maxWidth) return text;
		let fitted = text;
		while (fitted.length > 1 && context.measureText(`${fitted}…`).width > maxWidth) {
			fitted = fitted.slice(0, -1);
		}
		return `${fitted}…`;
	}

	function resolvedExportTheme(theme: ChartExportOptions['theme']): 'light' | 'dark' {
		if (theme !== 'current') return theme;
		return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	function shareSeriesColor(color: string, isDark: boolean, index: number): string {
		if (!isDark) return color || ['#2f6d47', '#c84e46', '#7c3aed', '#0284c7'][index % 4];
		const known: Record<string, string> = {
			'#2d6645': '#78d397',
			'#2f6d47': '#78d397',
			'#c84e46': '#fb7185',
			'#7f8c83': '#94a3b8',
			'#7c3aed': '#c4b5fd',
			'#0284c7': '#7dd3fc'
		};
		return known[color.toLowerCase()] ?? (color || ['#78d397', '#fb7185', '#c4b5fd', '#7dd3fc'][index % 4]);
	}

	function buildShareChartOption(
		echarts: typeof import('$lib/chart-runtime')['echarts'],
		theme: 'light' | 'dark',
		options: ChartExportOptions,
		progress: number
	) {
		const isDark = theme === 'dark';
		const inputSeries: SeriesData[] = seriesList?.length
			? seriesList
			: observations ? [{ name: exportHeading || 'Value', color: '', observations }] : [];
		const prepared = prepareChartData(inputSeries, categoryLabels);
		const averageEnabled = options.includeMovingAverage && prepared.dates.length >= 7;
		const surface = isDark ? '#111a14' : '#ffffff';
		const text = isDark ? '#edf5ef' : '#172019';
		const muted = isDark ? '#9aaba0' : '#64748b';
		const grid = isDark ? 'rgba(154, 171, 160, 0.16)' : 'rgba(100, 116, 139, 0.14)';
		const chartSeries: any[] = [];

		inputSeries.forEach((source: SeriesData, index: number) => {
			const color = shareSeriesColor(source.color, isDark, index);
			const rawValues = revealChartValues(prepared.seriesValues[index], progress);
			const showDirectName = inputSeries.length > 1;
			chartSeries.push({
				name: source.name,
				type: 'line',
				data: rawValues,
				smooth: 0.25,
				showSymbol: false,
				symbol: 'circle',
				symbolSize: 8,
				connectNulls: false,
				color,
				lineStyle: {
					width: averageEnabled ? 2.5 : 3.5,
					opacity: averageEnabled ? 0.42 : 1
				},
				areaStyle: index === 0 ? {
					opacity: averageEnabled ? 0.08 : 0.16,
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: `${color}55` },
						{ offset: 1, color: `${color}00` }
					])
				} : undefined,
				markPoint: index === 0 && progress >= 0.999 ? {
					symbol: 'circle',
					symbolSize: 14,
					itemStyle: { color, borderColor: surface, borderWidth: 4 },
					label: {
						show: true,
						position: 'top',
						distance: 9,
						color: text,
						backgroundColor: surface,
						borderColor: grid,
						borderWidth: 1,
						borderRadius: 6,
						padding: [5, 8],
						fontSize: 11,
						fontWeight: 750,
						formatter: (params: { value: number }) => `Record  ${compactChartNumber(Number(params.value))}`
					},
					data: [{ type: 'max', name: 'Record' }]
				} : undefined,
				endLabel: {
					show: !averageEnabled,
					color,
					fontSize: 13,
					fontWeight: 750,
					distance: 10,
					formatter: (params: { value: number }) => `${showDirectName ? `${source.name}  ` : ''}${compactChartNumber(Number(params.value))}`
				},
				labelLayout: { moveOverlap: 'shiftY', hideOverlap: true },
				emphasis: { focus: 'series', lineStyle: { width: 5 } }
			});

			if (averageEnabled) {
				const average = revealChartValues(computeMovingAverage(prepared.seriesValues[index]), progress);
				chartSeries.push({
					name: `${source.name} · 7-day average`,
					type: 'line',
					data: average,
					smooth: 0.35,
					showSymbol: false,
					color,
					lineStyle: { width: 4, type: 'dashed', opacity: 1 },
					endLabel: {
						show: true,
						color,
						fontSize: 12,
						fontWeight: 800,
						distance: 10,
						formatter: (params: { value: number }) => `${inputSeries.length > 1 ? `${source.name} avg` : '7d avg'}  ${compactChartNumber(Number(params.value))}`
					},
					labelLayout: { moveOverlap: 'shiftY', hideOverlap: true }
				});
			}
		});

		const visibleDateCount = Math.max(1, Math.ceil(prepared.dates.length * Math.max(0, progress)));
		const visibleDates = new Set(prepared.dates.slice(0, visibleDateCount));
		const markerData: any[] = [];
		if (options.includeEvents) {
			for (const marker of releaseMarkers.filter((item: ReleaseMarker) => visibleDates.has(item.date)).slice(-4)) {
				markerData.push({
					xAxis: marker.date,
					label: { formatter: `v${marker.version}` }
				});
			}
			for (const event of projectEvents.filter((item: ProjectEventItem) => visibleDates.has(item.date)).slice(-4)) {
				const impact = event.impact?.status === 'calculated' ? ` · ${event.impact.summaryText}` : '';
				markerData.push({
					xAxis: event.date,
					label: { formatter: fitPlainText(`${event.icon || '•'} ${event.title}${impact}`, 34) }
				});
			}
		}
		if (markerData.length && chartSeries.length) {
			chartSeries[0].markLine = {
				silent: true,
				symbol: ['none', 'none'],
				lineStyle: { type: 'dashed', width: 1.5, color: isDark ? '#78d39799' : '#2f6d4799' },
				label: {
					position: 'insideEndTop',
					color: isDark ? '#d9fbe5' : '#14532d',
					backgroundColor: isDark ? '#1b2d21' : '#eaf8ef',
					borderColor: isDark ? '#31533c' : '#b9dfc5',
					borderWidth: 1,
					borderRadius: 5,
					padding: [4, 7],
					fontSize: 11,
					fontWeight: 700
				},
				data: markerData
			};
		}

		return {
			animation: false,
			backgroundColor: surface,
			grid: { left: 78, right: 150, top: 38, bottom: 58 },
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: prepared.dates,
				axisTick: { show: false },
				axisLine: { lineStyle: { color: grid } },
				axisLabel: {
					color: muted,
					fontSize: 12,
					margin: 14,
					hideOverlap: true,
					formatter: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5) : value
				}
			},
			yAxis: {
				type: 'value',
				splitNumber: 4,
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: {
					color: muted,
					fontSize: 12,
					formatter: (value: number) => compactChartNumber(value)
				},
				splitLine: { lineStyle: { color: grid, width: 1 } }
			},
			textStyle: { color: text, fontFamily: 'Inter, system-ui, sans-serif' },
			series: chartSeries
		};
	}

	function fitPlainText(text: string, maxLength: number): string {
		return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1))}…`;
	}

	function wrapCanvasText(
		context: CanvasRenderingContext2D,
		text: string,
		maxWidth: number,
		maxLines = 2
	): string[] {
		const words = text.trim().split(/\s+/).filter(Boolean);
		const lines: string[] = [];
		let current = '';
		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (!current || context.measureText(candidate).width <= maxWidth) {
				current = candidate;
				continue;
			}
			lines.push(current);
			current = word;
			if (lines.length === maxLines - 1) break;
		}
		if (current && lines.length < maxLines) lines.push(current);
		const consumed = lines.join(' ').split(/\s+/).length;
		if (consumed < words.length && lines.length) {
			lines[lines.length - 1] = fitCanvasText(context, `${lines[lines.length - 1]}…`, maxWidth);
		}
		return lines;
	}

	async function renderShareChartImage(
		theme: 'light' | 'dark',
		options: ChartExportOptions,
		width: number,
		height: number,
		progress: number
	): Promise<HTMLImageElement> {
		const host = document.createElement('div');
		host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
		document.body.appendChild(host);
		let exportChart: EChartsType | null = null;
		try {
			const { echarts } = await import('$lib/chart-runtime');
			exportChart = echarts.init(host, undefined, { renderer: 'svg', width, height });
			exportChart.setOption(buildShareChartOption(echarts, theme, options, progress));
			await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
			return await loadImage(exportChart.getDataURL({
				type: 'svg',
				backgroundColor: theme === 'dark' ? '#111a14' : '#ffffff'
			}));
		} finally {
			exportChart?.dispose();
			host.remove();
		}
	}

	async function projectLogoImage(): Promise<HTMLImageElement | null> {
		if (!exportLogoUrl) return null;
		if (cachedLogoImage !== undefined) return cachedLogoImage;
		try {
			cachedLogoImage = await loadImage(exportLogoUrl);
		} catch {
			cachedLogoImage = null;
		}
		return cachedLogoImage;
	}

	function drawRoundedImage(
		context: CanvasRenderingContext2D,
		image: HTMLImageElement,
		x: number,
		y: number,
		size: number,
		radius: number
	) {
		context.save();
		context.beginPath();
		context.roundRect(x, y, size, size, radius);
		context.clip();
		context.drawImage(image, x, y, size, size);
		context.restore();
	}

	async function renderSocialCanvas(
		options: ChartExportOptions,
		progress = 1,
		scale = 1
	): Promise<HTMLCanvasElement> {
		if (!chart) throw new Error('Chart is not ready.');
		const theme = resolvedExportTheme(options.theme);
		const isDark = theme === 'dark';
		const size = resolveChartExportSize(options.format, chart.getWidth(), chart.getHeight());
		const width = size.width;
		const height = size.height;
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(width * scale));
		canvas.height = Math.max(1, Math.round(height * scale));
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) throw new Error('Could not create the social export canvas.');
		context.scale(scale, scale);
		context.textBaseline = 'top';

		const colors = isDark ? {
			background: '#0b110d',
			backgroundGlow: '#193021',
			surface: '#111a14',
			border: '#263a2d',
			text: '#f3f8f4',
			muted: '#9aaba0',
			primary: '#78d397',
			positive: '#4ade80',
			negative: '#fb7185'
		} : {
			background: '#f4f8f5',
			backgroundGlow: '#dcefe2',
			surface: '#ffffff',
			border: '#dce8df',
			text: '#172019',
			muted: '#64748b',
			primary: '#2f6d47',
			positive: '#16803a',
			negative: '#c2414b'
		};

		const background = context.createRadialGradient(width * 0.72, height * 0.08, 20, width * 0.72, height * 0.08, width * 0.8);
		background.addColorStop(0, colors.backgroundGlow);
		background.addColorStop(1, colors.background);
		context.fillStyle = background;
		context.fillRect(0, 0, width, height);
		context.strokeStyle = colors.border;
		context.lineWidth = 6;
		context.strokeRect(3, 3, width - 6, height - 6);

		const margin = Math.round(width * 0.055);
		const portrait = options.format === 'portrait';
		const square = options.format === 'square';
		const top = portrait ? 50 : square ? 46 : 36;
		const logoSize = portrait ? 54 : 44;
		let contentY = top;

		if (options.includeIdentity) {
			let identityX = margin;
			if (options.includeLogo && exportLogoUrl) {
				const logo = await projectLogoImage();
				if (logo) {
					drawRoundedImage(context, logo, margin, contentY, logoSize, Math.round(logoSize * 0.28));
					identityX += logoSize + 14;
				}
			}
			context.font = `750 ${portrait ? 19 : 17}px Inter, system-ui, sans-serif`;
			context.fillStyle = colors.text;
			context.fillText(fitCanvasText(context, exportProjectName || 'KoalaData', width * 0.42), identityX, contentY + 3);
			if (options.identitySubtitle) {
				context.font = `600 ${portrait ? 14 : 12}px Inter, system-ui, sans-serif`;
				context.fillStyle = colors.muted;
				context.fillText(
					fitCanvasText(context, options.identitySubtitle, width - margin - identityX),
					identityX,
					contentY + (portrait ? 31 : 27)
				);
			}
			contentY += logoSize + (portrait ? 18 : 12);
		}

		if (options.includeTitle || options.includeValue) {
			const valueWidth = options.includeValue ? Math.min(width * 0.36, portrait ? 340 : 380) : 0;
			const headingWidth = options.includeTitle ? width - margin * 2 - valueWidth - (options.includeValue ? 28 : 0) : 0;
			if (options.includeTitle) {
				context.font = `800 ${portrait ? 43 : square ? 40 : 34}px Inter, system-ui, sans-serif`;
				context.fillStyle = colors.text;
				context.fillText(fitCanvasText(context, exportHeading || title || 'Metric trend', headingWidth), margin, contentY);
			}
			if (options.includeValue && exportValue) {
				context.textAlign = 'right';
				context.font = `850 ${portrait ? 48 : square ? 46 : 40}px Inter, system-ui, sans-serif`;
				context.fillStyle = colors.text;
				context.fillText(fitCanvasText(context, exportValue, valueWidth), width - margin, contentY - 3);
				context.textAlign = 'left';
			}
			if (options.includeValue && exportDelta) {
				const positive = !exportDelta.trim().startsWith('-');
				context.font = `750 ${portrait ? 15 : 13}px Inter, system-ui, sans-serif`;
				const deltaWidth = context.measureText(exportDelta).width + 22;
				const deltaX = width - margin - deltaWidth;
				const deltaY = contentY + (portrait ? 52 : 43);
				context.fillStyle = positive ? `${colors.positive}22` : `${colors.negative}22`;
				context.beginPath();
				context.roundRect(deltaX, deltaY, deltaWidth, 28, 14);
				context.fill();
				context.fillStyle = positive ? colors.positive : colors.negative;
				context.fillText(exportDelta, deltaX + 11, deltaY + 6);
			}
			contentY += portrait ? 78 : 62;
		}

		if (options.includeInsight && (exportInsight || exportSubtitle)) {
			context.font = `650 ${portrait ? 19 : 16}px Inter, system-ui, sans-serif`;
			context.fillStyle = exportValue?.trim().startsWith('-') ? colors.negative : colors.primary;
			context.fillText(fitCanvasText(context, exportInsight || exportSubtitle || '', width - margin * 2), margin, contentY);
			contentY += portrait ? 34 : 28;
		}

		if (options.customText) {
			context.font = `600 ${portrait ? 17 : 15}px Inter, system-ui, sans-serif`;
			const customLines = wrapCanvasText(context, options.customText, width - margin * 2 - 32, 2);
			const lineHeight = portrait ? 24 : 21;
			const calloutHeight = customLines.length * lineHeight + 20;
			context.fillStyle = `${colors.primary}14`;
			context.beginPath();
			context.roundRect(margin, contentY, width - margin * 2, calloutHeight, 12);
			context.fill();
			context.fillStyle = colors.primary;
			context.fillRect(margin, contentY + 8, 4, calloutHeight - 16);
			context.fillStyle = colors.text;
			customLines.forEach((line, index) => context.fillText(line, margin + 20, contentY + 10 + index * lineHeight));
			contentY += calloutHeight + 10;
		}

		const detail = [
			exportSubtitle,
			exportTimeframe,
			exportDataDate ? `Data through ${exportDataDate}` : '',
			options.includeMovingAverage ? '7-day average' : ''
		].filter(Boolean).join('  ·  ');
		if (options.includeDetails && detail) {
			context.font = `600 ${portrait ? 15 : 13}px Inter, system-ui, sans-serif`;
			context.fillStyle = colors.muted;
			context.fillText(fitCanvasText(context, detail, width - margin * 2), margin, contentY);
			contentY += portrait ? 32 : 27;
		}

		const footerHeight = options.includeBranding ? (portrait ? 82 : 62) : (portrait ? 34 : 28);
		const desiredChartHeight = Math.round(height * Math.min(82, Math.max(45, options.chartHeightPercent)) / 100);
		const chartX = margin;
		const chartY = Math.max(contentY + (portrait ? 16 : 12), height - footerHeight - desiredChartHeight);
		const chartWidth = width - margin * 2;
		const chartHeight = Math.max(180, height - chartY - footerHeight);

		context.fillStyle = colors.surface;
		context.strokeStyle = colors.border;
		context.lineWidth = 2;
		context.beginPath();
		context.roundRect(chartX, chartY, chartWidth, chartHeight, portrait ? 24 : 18);
		context.fill();
		context.stroke();

		const chartImage = await renderShareChartImage(
			theme,
			options,
			Math.max(320, Math.round(chartWidth * scale)),
			Math.max(220, Math.round(chartHeight * scale)),
			progress
		);
		context.save();
		context.beginPath();
		context.roundRect(chartX + 2, chartY + 2, chartWidth - 4, chartHeight - 4, portrait ? 22 : 16);
		context.clip();
		context.drawImage(chartImage, chartX + 2, chartY + 2, chartWidth - 4, chartHeight - 4);
		context.restore();

		if (options.includeBranding) {
			const footerY = height - (portrait ? 52 : 40);
			context.font = `650 ${portrait ? 15 : 13}px Inter, system-ui, sans-serif`;
			context.fillStyle = colors.muted;
			context.fillText('Verified privacy-first analytics', margin, footerY);
			context.textAlign = 'right';
			context.font = `800 ${portrait ? 17 : 15}px Inter, system-ui, sans-serif`;
			context.fillStyle = colors.primary;
			context.fillText(fitCanvasText(context, exportShareUrl || 'data.koalastuff.net', width * 0.48), width - margin, footerY - 1);
			context.textAlign = 'left';
		}

		return canvas;
	}

	async function renderSocialPng(options: ChartExportOptions): Promise<Blob> {
		return canvasBlob(await renderSocialCanvas(options), 'image/png');
	}

	async function renderSocialGif(
		options: ChartExportOptions,
		onProgress: (progress: number) => void
	): Promise<Blob> {
		const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
		if (!chart) throw new Error('Chart is not ready.');
		const size = resolveChartExportSize(options.format, chart.getWidth(), chart.getHeight());
		const maxWidth = options.format === 'portrait' ? 600 : options.format === 'square' ? 700 : 820;
		const scale = Math.min(1, maxWidth / size.width);
		const frameCount = 16;
		const encoder = GIFEncoder();
		for (let index = 0; index < frameCount; index++) {
			const linear = (index + 1) / frameCount;
			const eased = 1 - Math.pow(1 - linear, 3);
			const frame = await renderSocialCanvas(options, eased, scale);
			const context = frame.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Could not read the GIF frame.');
			const pixels = context.getImageData(0, 0, frame.width, frame.height).data;
			const palette = quantize(pixels, 128, { format: 'rgb444' });
			const indexed = applyPalette(pixels, palette, 'rgb444');
			encoder.writeFrame(indexed, frame.width, frame.height, {
				palette,
				delay: index === frameCount - 1 ? 2_200 : 210,
				repeat: -1
			});
			onProgress((index + 1) / frameCount);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		}
		encoder.finish();
		const output = encoder.bytes();
		const copy = new Uint8Array(new ArrayBuffer(output.byteLength));
		copy.set(output);
		return new Blob([copy.buffer], { type: 'image/gif' });
	}

	function exportCSV() {
		exporting = true;
		try {
			const prepared = prepareChartData(
				seriesList?.length ? seriesList : observations ? [{ observations }] : [],
				categoryLabels
			);
			if (!prepared.dates.length) return;
			let csv = '';
			if (seriesList && seriesList.length > 0) {
				const headers = ['Date', ...seriesList.map((s: SeriesData) => s.name)];
				csv = headers.map(csvCell).join(',') + '\n';
				for (let i = 0; i < prepared.dates.length; i++) {
					const row = [prepared.dates[i], ...prepared.seriesValues.map((values) => values[i] ?? '')];
					csv += row.map(csvCell).join(',') + '\n';
				}
			} else if (observations) {
				csv = 'Date,Value\n';
				for (let i = 0; i < prepared.dates.length; i++) {
					csv += `${csvCell(prepared.dates[i])},${csvCell(prepared.seriesValues[0][i] ?? '')}\n`;
				}
			} else {
				return;
			}
			const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
			downloadBlob(blob, `${title || 'chart'}.csv`);
		} finally {
			exporting = false;
		}
	}

	let chartDom: HTMLDivElement;
	let chart: EChartsType | null = null;
	let destroyed = false;
	let compactMode: boolean | null = null;

	async function initChart() {
		const generation = ++initGeneration;
		chartReady = false;
		chartError = false;
		if (!chartDom) return;
		const inputSeries = seriesList?.length
			? seriesList
			: observations ? [{ name: 'Actual', color: '', observations }] : [];
		const prepared = prepareChartData(inputSeries, categoryLabels);
		hasData = prepared.dates.length > 0;
		chartStartLabel = prepared.dates[0] ?? '';
		if (!hasData) {
			chart?.dispose();
			chart = null;
			chartReady = true;
			return;
		}

		try {
			const { echarts } = await import('$lib/chart-runtime');
			if (destroyed || generation !== initGeneration || !chartDom.isConnected) return;

			if (chart) {
				chart.dispose();
				chart = null;
			}

			chart = echarts.init(chartDom, undefined, { renderer: 'svg' });

			const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
			const isCompact = chartDom.clientWidth <= 520;
			compactMode = isCompact;

			let dates = [...prepared.dates];
			let seriesOptions: any[] = [];

			if (seriesList && seriesList.length > 0) {
				seriesOptions = seriesList.flatMap((s: SeriesData, seriesIndex: number) => {
					const values = prepared.seriesValues[seriesIndex];
					const result: any[] = [{
						name: s.name,
						data: values,
						type: 'line',
						smooth: true,
						showSymbol: false,
						symbol: 'circle',
						symbolSize: isCompact ? 4 : 7,
						color: s.color,
						lineStyle: { width: isCompact ? 2 : 2.5, opacity: showMovingAverage ? 0.5 : 1 },
						areaStyle: seriesIndex === 0 ? {
							opacity: showMovingAverage ? 0.08 : 0.16,
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: s.color + '1A' },
								{ offset: 1, color: s.color + '00' }
							])
						} : undefined,
						emphasis: { focus: 'series', lineStyle: { width: isCompact ? 3 : 4 } }
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
							lineStyle: { width: isCompact ? 2.5 : 3, type: 'dashed' },
							areaStyle: undefined
						});
					}
					return result;
				});
			} else if (observations) {
			const values = prepared.seriesValues[0];
			const mainColor = isDark ? '#78d397' : '#2f6d47';

			seriesOptions = [
				{
					name: 'Actual',
					data: [...values],
					type: 'line',
					smooth: true,
					showSymbol: false,
					symbol: 'circle',
				symbolSize: isCompact ? 4 : 7,
					color: mainColor,
				lineStyle: { width: isCompact ? 2 : 2.5, opacity: showMovingAverage ? 0.5 : 1 },
					areaStyle: {
						opacity: showMovingAverage ? 0.08 : 0.16,
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, isDark ? [
							{ offset: 0, color: 'rgba(120, 211, 151, 0.25)' },
							{ offset: 1, color: 'rgba(120, 211, 151, 0.0)' }
						] : [
							{ offset: 0, color: 'rgba(47, 109, 71, 0.25)' },
							{ offset: 1, color: 'rgba(47, 109, 71, 0.0)' }
						])
					},
					emphasis: { focus: 'series', lineStyle: { width: isCompact ? 3 : 4 } }
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
					lineStyle: { width: isCompact ? 2.5 : 3, type: 'dashed' },
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

		const directLabels = !isCompact && seriesOptions.length <= 3;
		if (directLabels) {
			for (const series of seriesOptions) {
				series.endLabel = {
					show: true,
					color: series.color,
					fontSize: 10,
					fontWeight: 700,
					distance: 6,
					formatter: (params: { value: number }) => compactChartNumber(Number(params.value))
				};
				series.labelLayout = { moveOverlap: 'shiftY', hideOverlap: true };
			}
		}

		const markLineData: any[] = [];

		if (showReleaseMarkers && releaseMarkers && releaseMarkers.length > 0 && seriesOptions.length > 0) {
			const dateSet = new Set(dates);
			const validMarkers = releaseMarkers.filter((m: ReleaseMarker) => dateSet.has(m.date));
			for (const m of validMarkers) {
				markLineData.push({
					xAxis: m.date,
					label: {
						formatter: `v${m.version}`,
						position: 'insideEndTop',
						color: isDark ? '#78d397' : '#2f6d47',
						fontSize: 10,
						fontWeight: 'bold',
						backgroundColor: isDark ? '#1a241d' : '#f0f9f4',
						padding: [2, 4],
						borderRadius: 3,
						borderColor: isDark ? '#2a382e' : '#bbf7d0',
						borderWidth: 1
					},
					lineStyle: {
						type: 'dashed',
						color: isDark ? 'rgba(120, 211, 151, 0.65)' : 'rgba(47, 109, 71, 0.65)',
						width: 1.5
					}
				});
			}
		}

		if (showProjectEvents && projectEvents && projectEvents.length > 0 && seriesOptions.length > 0) {
			const dateSet = new Set(dates);
			const validEvents = projectEvents.filter((ev: ProjectEventItem) => dateSet.has(ev.date));
			const eventsByDate = new Map<string, ProjectEventItem[]>();
			for (const ev of validEvents) {
				const list = eventsByDate.get(ev.date) || [];
				list.push(ev);
				eventsByDate.set(ev.date, list);
			}

			for (const [eventDate, evList] of eventsByDate.entries()) {
				const firstEv = evList[0];
				const iconStr = firstEv.icon || (firstEv.category === 'badge' ? '🏅' : firstEv.category === 'release' ? '🚀' : firstEv.category === 'marketing' ? '📢' : firstEv.category === 'incident' ? '⚠️' : '📌');
				const labelText = evList.length === 1 
					? `${iconStr} ${firstEv.title}` 
					: `${iconStr} ${evList.length} Events (${firstEv.title}, ...)`;

				markLineData.push({
					xAxis: eventDate,
					label: {
						formatter: labelText,
						position: 'insideEndTop',
						color: isDark ? '#f0fdf4' : '#14532d',
						fontSize: 10,
						fontWeight: 'bold',
						backgroundColor: isDark ? '#14291a' : '#dcfce7',
						padding: [3, 6],
						borderRadius: 4,
						borderColor: isDark ? '#22543d' : '#86efac',
						borderWidth: 1
					},
					lineStyle: {
						type: 'dashed',
						color: isDark ? 'rgba(74, 222, 128, 0.8)' : 'rgba(22, 163, 74, 0.8)',
						width: 1.5
					}
				});
			}
		}

		if (markLineData.length > 0 && seriesOptions.length > 0) {
			seriesOptions[0].markLine = {
				symbol: ['none', 'none'],
				silent: true,
				data: markLineData
			};
		}

		const hasZoomSlider = dates.length > 30;
		const legendData = seriesOptions.map((s: any) => s.name);
		const hasLegend = legendData.length > 1;

		const option = {
			animation: typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
			grid: {
				left: isCompact ? 4 : '3%',
				right: isCompact ? 4 : directLabels ? 72 : '3%',
				bottom: hasZoomSlider ? (isCompact ? 52 : '16%') : (isCompact ? 28 : '8%'),
				top: hasLegend ? (isCompact ? 44 : '14%') : (isCompact ? 18 : '6%'),
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			legend: hasLegend ? {
				data: legendData,
				type: 'scroll',
				top: 0,
				left: 0,
				right: isCompact ? 76 : 0,
				pageIconSize: 10,
				itemWidth: isCompact ? 14 : 25,
				itemHeight: isCompact ? 8 : 14,
				textStyle: {
					color: isDark ? '#a5b2a8' : '#64748b',
					fontFamily: 'Inter, system-ui, sans-serif',
					fontSize: isCompact ? 10 : 11
				}
			} : undefined,
			tooltip: {
				trigger: 'axis',
				confine: true,
				backgroundColor: isDark ? '#151c17' : 'rgba(255, 255, 255, 0.95)',
				borderWidth: 1,
				borderColor: isDark ? '#2a382e' : '#e2e8f0',
				textStyle: {
					color: isDark ? '#edf5ef' : '#1e293b',
					fontSize: 12
				},
				formatter: (params: any) => {
					if (!Array.isArray(params) || params.length === 0) return '';
					const axisValue = params[0].axisValue;
					let html = `<div style="font-weight: 600; margin-bottom: 4px;">${axisValue}</div>`;

					if (showProjectEvents && projectEvents && projectEvents.length > 0) {
						const dateEvents = projectEvents.filter((ev: ProjectEventItem) => ev.date === axisValue);
						for (const ev of dateEvents) {
							const iconStr = escapeHtml(ev.icon || '📌');
							const titleStr = escapeHtml(ev.title);
							const descStr = ev.description ? escapeHtml(ev.description) : null;
							const impactStr = ev.impact?.status === 'calculated'
								? `<div style="font-size: 11px; font-weight: 600; color: ${ev.impact.percentChange !== null && ev.impact.percentChange >= 0 ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#f87171' : '#b91c1c')}; margin-top: 2px;">Impact (7d): ${escapeHtml(ev.impact.summaryText)}</div>`
								: '';
							html += `<div style="margin-bottom: 6px; padding: 4px 6px; background: ${isDark ? 'rgba(74, 222, 128, 0.15)' : '#f0fdf4'}; border-radius: 4px; border: 1px solid ${isDark ? '#22543d' : '#bbf7d0'};">
								<span style="font-size: 12px; font-weight: 600;">${iconStr} ${titleStr}</span>
								${impactStr}
								${descStr ? `<div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">${descStr}</div>` : ''}
							</div>`;
						}
					}

					for (const item of params) {
						if (item.value === null || item.value === undefined) continue;
						const colorDot = `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:${item.color};"></span>`;
						const valStr = typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
						html += `<div style="font-size: 11px;">${colorDot} ${item.seriesName}: <strong>${valStr}</strong></div>`;
					}
					return html;
				}
			},
			xAxis: {
				type: 'category',
				data: dates,
				axisLabel: {
					rotate: isCompact && dates.length > 8 ? 35 : 0,
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
				splitNumber: isCompact ? 4 : 5,
				axisLabel: {
					color: isDark ? '#a5b2a8' : '#64748b',
					fontSize: 10,
					formatter: (value: number) => compactChartNumber(value)
				},
				splitLine: {
					lineStyle: {
						color: isDark ? '#2a382e' : '#f1f5f9'
					}
				}
			},
				dataZoom: chartDataZoom(dates.length)?.map((zoom) => ({
					...zoom,
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
				})),
			series: seriesOptions
		};

			chart.setOption(option);
			if (generation === initGeneration) chartReady = true;
		} catch (error) {
			if (generation === initGeneration && !destroyed) {
				chartError = true;
				console.error('[MetricChart] Failed to render chart:', error instanceof Error ? error.stack ?? error.message : String(error));
			}
		}
	}

	$effect(() => {
		if (observations || seriesList) {
			void categoryLabels;
			void showMovingAverage;
			void showForecast;
			void showReleaseMarkers;
			void showProjectEvents;
			void projectEvents;
			void initChart();
		}
	});

	onMount(() => {
		void initChart();
		const handleResize = () => {
			if (!chartDom) return;
			const nextCompactMode = chartDom.clientWidth <= 520;
			if (compactMode !== null && nextCompactMode !== compactMode) {
				compactMode = nextCompactMode;
				void initChart();
				return;
			}
			chart?.resize();
		};
		const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
		resizeObserver?.observe(chartDom);
		if (!resizeObserver) window.addEventListener('resize', handleResize);
		return () => {
			resizeObserver?.disconnect();
			if (!resizeObserver) window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		destroyed = true;
		if (chart) {
			chart.dispose();
		}
	});
</script>

<div
	class="chart-container-wrapper"
	data-export-heading={exportHeading}
	data-export-subtitle={exportSubtitle}
	data-export-value={exportValue}
	data-export-project-description={exportProjectDescription}
	data-export-moving-average={showMovingAverage}
>
	{#if hasData}<div class="chart-export-buttons" aria-label="Chart exports">
		{#if projectEvents && projectEvents.length > 0}
			<button 
				type="button" 
				class="export-btn" 
				class:active={showProjectEvents}
				onclick={() => { showProjectEvents = !showProjectEvents; }}
				title="Toggle event markers on graph"
				aria-label="Toggle event markers"
			>
				{showProjectEvents ? 'Events ON' : 'Events OFF'}
			</button>
		{/if}
		{#if releaseMarkers && releaseMarkers.length > 0}
			<button 
				type="button" 
				class="export-btn" 
				class:active={showReleaseMarkers}
				onclick={() => { showReleaseMarkers = !showReleaseMarkers; }}
				title="Toggle version release markers on graph"
				aria-label="Toggle version release markers"
			>
				{showReleaseMarkers ? 'Hide Releases' : 'Tag Releases'}
			</button>
		{/if}
		<button class="export-btn share-export-btn" onclick={() => shareModalOpen = true} disabled={!chartReady} title="Create social image or animated GIF" aria-label="Share or download chart"><span aria-hidden="true">✦</span> Share</button>
		<button class="export-btn" onclick={exportCSV} disabled={exporting} title="Download CSV" aria-label="Download chart data as CSV">CSV</button>
	</div>{/if}
	<div bind:this={chartDom} class="chart-dom" role="img" aria-label={title ? `${title.replaceAll('-', ' ')} trend chart` : 'Metric trend chart'} aria-busy={!chartReady && !chartError} data-has-data={hasData} data-start-label={chartStartLabel}></div>
	{#if !hasData}
		<div class="chart-status" role="status">No data in selected timeframe.</div>
	{:else if !chartReady}
		<div class="chart-status" role="status">
			{chartError ? 'Chart could not be rendered.' : 'Loading chart…'}
		</div>
	{/if}
</div>

<ChartShareModal
	isOpen={shareModalOpen}
	onClose={() => shareModalOpen = false}
	renderPng={renderSocialPng}
	renderGif={renderSocialGif}
	filename={`${chartExportSlug(title || exportHeading || 'chart')}-social`}
	projectName={exportProjectName}
	projectDescription={exportProjectDescription}
	heading={exportHeading}
	timeframe={exportTimeframe}
	shareUrl={exportShareUrl}
	insight={exportInsight}
	initialMovingAverage={showMovingAverage}
	hasMovingAverage={movingAverageExportAvailable}
	hasEvents={projectEvents.length > 0 || releaseMarkers.length > 0}
	hasLogo={Boolean(exportLogoUrl)}
/>

<style>
	.chart-container-wrapper {
		width: 100%;
		min-width: 0;
		height: clamp(320px, 34vw, 400px);
		position: relative;
	}

	@media (max-width: 520px) {
		.chart-container-wrapper { height: clamp(280px, 88vw, 320px); }
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
	@media (hover: none), (pointer: coarse) {
		.chart-export-buttons { opacity: 1; }
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
	.export-btn.active {
		background-color: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}
	.share-export-btn {
		color: var(--primary);
	}
	.export-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 520px) {
		.export-btn { min-width: 2.25rem; min-height: 2rem; background-color: color-mix(in srgb, var(--bg-surface) 92%, transparent); }
	}
</style>

import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	MarkLineComponent,
	MarkPointComponent,
	TitleComponent,
	TooltipComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
	LineChart,
	GridComponent,
	TitleComponent,
	TooltipComponent,
	LegendComponent,
	DataZoomComponent,
	MarkLineComponent,
	MarkPointComponent,
	SVGRenderer
]);

export { echarts };

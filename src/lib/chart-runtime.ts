import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TitleComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TitleComponent, TooltipComponent, LegendComponent, DataZoomComponent, SVGRenderer]);

export { echarts };

'use client';

import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import type { EChartsOption } from 'echarts';
import { tokens } from '@/lib/theme';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <Box sx={{ height: '100%', width: '100%' }} />,
});

interface EChartProps {
  option: EChartsOption;
  height?: number | string;
}

const axisDefaults = {
  axisLine: { lineStyle: { color: tokens.border } },
  axisTick: { show: false },
  axisLabel: { color: tokens.textSecondary },
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
};

/** 把深色主题默认值合并进调用方的 option，保证图表在 Midnight 主题下可读 */
function withDarkDefaults(option: EChartsOption): EChartsOption {
  const mergeAxis = (axis: unknown) => {
    if (Array.isArray(axis)) return axis.map((a) => ({ ...axisDefaults, ...a }));
    if (axis && typeof axis === 'object') return { ...axisDefaults, ...(axis as object) };
    return axis;
  };

  return {
    textStyle: { color: tokens.textSecondary, fontFamily: 'inherit' },
    ...option,
    legend: {
      textStyle: { color: tokens.textSecondary },
      ...(typeof option.legend === 'object' && !Array.isArray(option.legend) ? option.legend : {}),
    },
    tooltip: {
      backgroundColor: '#0B0D14',
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.textPrimary },
      ...(typeof option.tooltip === 'object' && !Array.isArray(option.tooltip) ? option.tooltip : {}),
    },
    xAxis: mergeAxis(option.xAxis),
    yAxis: mergeAxis(option.yAxis),
  } as EChartsOption;
}

export default function EChart({ option, height = 360 }: EChartProps) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ReactECharts option={withDarkDefaults(option)} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
    </Box>
  );
}

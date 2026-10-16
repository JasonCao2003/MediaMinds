import request, { type ApiResult } from '@/lib/request';
import type { ActivityAnnual, ActivitySummary, AnnualReport, MediaType } from '@/types';

// =============== 时长上报与统计（auth-service）===============

/**
 * 上报一段媒体消费时长。
 * 由 `useActivityTracker` 调用，只上报「真的在消费内容」的增量秒数。
 */
export const reportActivityService = (mediaType: MediaType, seconds: number) =>
  request.post<ApiResult<void>>('/v1/auth/activity/report', { mediaType, seconds });

/** 时长汇总：各时间范围 + 每日明细 + 连续使用天数 + 可选年份 */
export const getActivitySummaryService = (days = 30) =>
  request.get<ApiResult<ActivitySummary>>('/v1/auth/activity/summary', { params: { days } });

/** 某个自然年的聚合（月度分布、最活跃的月与日、年度最长连续） */
export const getActivityAnnualService = (year: number) =>
  request.get<ApiResult<ActivityAnnual>>('/v1/auth/activity/annual', { params: { year } });

// =============== 年度报告（agent-service）===============

/**
 * 生成年度报告。
 * 数据由前端组装（时长来自 auth-service，内容清单来自各服务的收藏/历史接口），
 * 交给 agent-service 由大模型撰写；未配置大模型时后端会回退规则式报告。
 */
export const generateAnnualReportService = (payload: Record<string, unknown>) =>
  request.post<ApiResult<AnnualReport>>('/v1/agent/report', payload, { timeout: 120000 });

/**
 * 保存 / 覆盖某年度的报告（auth-service 侧按「用户 × 年份」upsert）。
 * 返回落库后的版本，含最近生成时间。
 */
export const saveAnnualReportService = (report: AnnualReport) =>
  request.post<ApiResult<AnnualReport>>('/v1/auth/report/annual', report);

/** 读取已保存的年度报告；没有生成过则 data 为 null */
export const getSavedAnnualReportService = (year: number) =>
  request.get<ApiResult<AnnualReport | null>>('/v1/auth/report/annual', { params: { year } });

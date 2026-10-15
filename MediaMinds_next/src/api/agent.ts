import request, { type ApiResult } from '@/lib/request';

// =============== 智能入库 Agent 接口 ===============

export interface AgentCandidate {
  source: string; // kugou | tmdb | douban
  type: string; // music | video | book
  sourceId: string;
  title: string;
  subtitle?: string;
  cover?: string;
  year?: string;
  rate?: number | null;
  extra?: Record<string, unknown>;
}

export interface AgentGroup {
  type: string;
  source: string;
  label: string;
  total?: number;
  hint?: string;
  error?: string;
  person?: { id: number; name: string; role: string; profile?: string };
  candidates: AgentCandidate[];
}

export interface AgentQueryResult {
  intent: { type: string; by: string; keyword: string };
  groups: AgentGroup[];
  hint?: string;
}

export interface AgentImportResult {
  imported: Array<{ source: string; sourceId: string; title: string; code?: number; message?: string }>;
  failed: Array<{ source: string; sourceId: string; title: string; code?: number; message?: string }>;
  importedCount: number;
  failedCount: number;
}

export const agentQueryService = (data: {
  message?: string;
  type?: string;
  by?: string;
  keyword?: string;
  page?: number;
  size?: number;
}) => request.post<ApiResult<AgentQueryResult>>('/v1/agent/query', data);

export const agentImportService = (items: AgentCandidate[]) =>
  request.post<ApiResult<AgentImportResult>>('/v1/agent/import', { items });

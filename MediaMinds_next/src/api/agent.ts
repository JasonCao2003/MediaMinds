import request, { type ApiResult } from '@/lib/request';

// =============== 智能入库 Agent 接口（LangChain4j + DeepSeek）===============

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
  /** 引擎：langchain4j（大模型）| rule（规则兜底） */
  engine?: string;
  /** 会话 ID，多轮对话时回传以保持上下文 */
  sessionId?: string;
  intent: { type: string; by: string; keyword: string };
  groups: AgentGroup[];
  /** 智能体的自然语言回复 */
  reply?: string;
  hint?: string;
  /** 降级说明 */
  error?: string;
  /** 本轮调用过的工具名 */
  tools?: string[];
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export interface AgentStatus {
  engine: string;
  llmEnabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  memoryWindow: number;
  maxToolInvocations: number;
}

export interface AgentImportResult {
  imported: Array<{ source: string; sourceId: string; title: string; code?: number; message?: string }>;
  failed: Array<{ source: string; sourceId: string; title: string; code?: number; message?: string }>;
  importedCount: number;
  failedCount: number;
}

/** 单轮检索（无会话记忆） */
export const agentQueryService = (data: {
  message?: string;
  type?: string;
  by?: string;
  keyword?: string;
  page?: number;
  size?: number;
}) => request.post<ApiResult<AgentQueryResult>>('/v1/agent/query', data);

/** 多轮对话（带会话记忆） */
export const agentChatService = (data: {
  sessionId?: string;
  message: string;
  type?: string;
  by?: string;
  keyword?: string;
}) => request.post<ApiResult<AgentQueryResult>>('/v1/agent/chat', data);

/** 清空会话记忆 */
export const agentClearSessionService = (sessionId: string) =>
  request.post<ApiResult<Record<string, never>>>('/v1/agent/session/clear', null, {
    params: { sessionId },
  });

/** Agent 运行状态（引擎 / 模型） */
export const agentStatusService = () => request.get<ApiResult<AgentStatus>>('/v1/agent/status');

export const agentImportService = (items: AgentCandidate[]) =>
  request.post<ApiResult<AgentImportResult>>('/v1/agent/import', { items });

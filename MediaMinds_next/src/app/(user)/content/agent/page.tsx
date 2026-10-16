'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import {
  agentChatService,
  agentClearSessionService,
  agentStatusService,
  agentImportService,
  type AgentCandidate,
  type AgentQueryResult,
  type AgentStatus,
} from '@/api/agent';

interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  text?: string;
  result?: AgentQueryResult;
}

const TYPE_OPTIONS = [
  { value: 'auto', label: '自动识别' },
  { value: 'music', label: '音乐' },
  { value: 'video', label: '影视' },
  { value: 'book', label: '图书' },
];

const BY_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'title', label: '标题' },
  { value: 'singer', label: '歌手' },
  { value: 'author', label: '作者' },
  { value: 'actor', label: '演员' },
  { value: 'director', label: '导演' },
];

const SOURCE_LABEL: Record<string, string> = {
  kugou: '酷狗',
  tmdb: 'TMDB',
  douban: '豆瓣',
};

const TYPE_LABEL: Record<string, string> = {
  music: '音乐',
  video: '影视',
  book: '图书',
};

/** 工具名 → 中文说明，用于展示智能体本轮调用了哪些能力 */
const TOOL_LABEL: Record<string, string> = {
  searchMusic: '检索音乐',
  searchMovies: '检索影片',
  searchMoviesByPerson: '按人物检索影片',
  searchBooks: '检索图书',
  importCandidates: '批量入库',
};

const keyOf = (c: AgentCandidate) => `${c.source}:${c.sourceId}`;

/** 气泡尾巴：左下/右下角收窄，其余用标准圆角令牌 */
const TAIL_LEFT = 'var(--mm-radius) var(--mm-radius) var(--mm-radius) var(--mm-radius-xs)';
const TAIL_RIGHT = 'var(--mm-radius) var(--mm-radius) var(--mm-radius-xs) var(--mm-radius)';

export default function AgentPage() {
  const { mm } = useTheme();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [type, setType] = useState('auto');
  const [by, setBy] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Record<string, AgentCandidate>>({});
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `m-${Date.now()}-${seq.current}`;
  };

  useEffect(() => {
    agentStatusService()
      .then((res) => setStatus(res.data ?? null))
      .catch(() => setStatus(null));
  }, []);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) {
      toast.warning('请先描述你想要的视频 / 图书 / 音乐');
      return;
    }
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await agentChatService({ sessionId, message: text, type, by });
      const data = res.data;
      if (data?.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { id: nextId(), role: 'agent', result: data }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'agent', text: '检索失败，请稍后重试。' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, type, by, sessionId]);

  const newSession = useCallback(async () => {
    const sid = sessionId;
    setMessages([]);
    setSelected({});
    setSessionId(undefined);
    if (sid) {
      try {
        await agentClearSessionService(sid);
      } catch {
        /* 会话清理失败不影响使用 */
      }
    }
    toast.success('已开启新会话');
  }, [sessionId]);

  const toggleSelect = (c: AgentCandidate) => {
    setSelected((prev) => {
      const next = { ...prev };
      const k = keyOf(c);
      if (next[k]) delete next[k];
      else next[k] = c;
      return next;
    });
  };

  const doImport = async () => {
    if (selectedList.length === 0) {
      toast.warning('请先选择要入库的条目');
      return;
    }
    setImporting(true);
    try {
      const res = await agentImportService(selectedList);
      const data = res.data;
      const ok = data?.importedCount ?? 0;
      const fail = data?.failedCount ?? 0;
      if (ok > 0) toast.success(`已入库 ${ok} 条元数据${fail > 0 ? `，${fail} 条失败` : ''}`);
      else toast.error(`入库失败${fail > 0 ? `（${fail} 条）` : ''}，请稍后重试`);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'agent',
          text: `批量入库完成：成功 ${ok} 条，失败 ${fail} 条。媒体本体未入库，可在对应列表页自行上传文件。`,
        },
      ]);
      setSelected({});
    } finally {
      setImporting(false);
    }
  };

  /** Agent 头像：描边小方块，让「谁在说话」不只靠左右对齐区分 */
  const agentAvatar = (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 'var(--mm-radius-sm)',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'var(--mm-bg)',
        boxShadow: 'var(--mm-raised-sm)',
        color: 'var(--mm-accent-text)',
      }}
    >
      <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
    </Box>
  );

  const renderCandidate = (c: AgentCandidate) => {
    const k = keyOf(c);
    const checked = Boolean(selected[k]);
    return (
      <Card
        key={k}
        onClick={() => toggleSelect(c)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          p: 1.25,
          cursor: 'pointer',
          borderRadius: 'var(--mm-radius)',
          // 选中 = 灰底 + 更粗的描边；未选中 = 白底 + 细描边（不靠颜色单独传达）
          bgcolor: checked ? 'var(--mm-sunken)' : 'var(--mm-bg)',
          boxShadow: checked ? 'var(--mm-raised-lg)' : 'var(--mm-raised-sm)',
        }}
      >
        <Checkbox checked={checked} size="small" tabIndex={-1} sx={{ p: 0.5 }} />
        <Avatar variant="rounded" src={c.cover || undefined} sx={{ width: 46, height: 46 }}>
          {(c.title || '?')[0]}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {c.title || '未命名'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {[c.subtitle, c.year].filter(Boolean).join(' · ') || '—'}
          </Typography>
        </Box>
        {typeof c.rate === 'number' && c.rate > 0 && (
          <Typography variant="caption" sx={{ color: mm.warning, fontWeight: 700 }}>
            {c.rate.toFixed(1)}
          </Typography>
        )}
        <Chip size="small" label={SOURCE_LABEL[c.source] ?? c.source} />
        {checked && (
          <Chip size="small" label="已选" sx={{ color: mm.success, fontWeight: 700 }} />
        )}
      </Card>
    );
  };

  const engineChip = status?.llmEnabled ? (
    <Chip
      size="small"
      color="primary"
      label={`Agent 引擎：LangChain4j · ${status.model}`}
      sx={{ fontWeight: 600 }}
    />
  ) : (
    <Chip size="small" label="Agent 引擎：规则解析（未配置大模型）" />
  );

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            size="small"
            label="媒体类型"
            value={type}
            onChange={(e) => setType(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="检索维度"
            value={by}
            onChange={(e) => setBy(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {BY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          {engineChip}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            数据源：酷狗音乐 · TMDB · 豆瓣图书
          </Typography>
        </Stack>
      </Card>

      <Card
        sx={{
          p: 2.5,
          mb: 2.5,
          minHeight: 320,
          maxHeight: '56vh',
          overflowY: 'auto',
          borderRadius: 'var(--mm-radius-lg)',
        }}
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 64 }} />}
            title="告诉我你想要什么"
            description="例如：我想要周杰伦的歌 / 帮我找电影 星际穿越 / 有没有刘慈欣写的书 / 汤姆·汉克斯主演的影片。也可以连续追问，比如「前三个都入库」。"
          />
        ) : (
          <Stack spacing={2.5}>
            {messages.map((m) => {
              if (m.role === 'user') {
                return (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Box
                      sx={{
                        maxWidth: '78%',
                        px: 2,
                        py: 1.25,
                        borderRadius: TAIL_RIGHT,
                        bgcolor: 'var(--mm-bg)',
                        boxShadow: 'var(--mm-raised-sm)',
                        color: 'var(--mm-text)',
                        fontWeight: 600,
                      }}
                    >
                      {m.text}
                    </Box>
                  </Box>
                );
              }
              if (m.text) {
                return (
                  <Box key={m.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    {agentAvatar}
                    <Box
                      sx={{
                        maxWidth: '78%',
                        px: 2,
                        py: 1.25,
                        borderRadius: TAIL_LEFT,
                        bgcolor: 'var(--mm-sunken)',
                        boxShadow: 'var(--mm-sunken-sm)',
                        color: 'var(--mm-text)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.text}
                    </Box>
                  </Box>
                );
              }
              const result = m.result;
              const groups = (result?.groups ?? []).filter((g) => g.candidates.length > 0 || g.error || g.hint);
              return (
                <Box key={m.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  {agentAvatar}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {result?.reply && (
                      <Box
                        sx={{
                          maxWidth: '78%',
                          px: 2,
                          py: 1.25,
                          mb: 1.5,
                          borderRadius: TAIL_LEFT,
                          bgcolor: 'var(--mm-sunken)',
                          boxShadow: 'var(--mm-sunken-sm)',
                          color: 'var(--mm-text)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {result.reply}
                      </Box>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={result?.engine === 'langchain4j' ? 'primary' : 'default'}
                        label={result?.engine === 'langchain4j' ? 'LangChain4j' : '规则解析'}
                      />
                      {result?.tools?.map((t, i) => (
                        <Chip
                          key={`${t}-${i}`}
                          size="small"
                          variant="outlined"
                          icon={<BuildRoundedIcon />}
                          label={TOOL_LABEL[t] ?? t}
                        />
                      ))}
                      {result?.usage?.totalTokens ? (
                        <Typography variant="caption" color="text.secondary">
                          {result.usage.totalTokens} tokens
                        </Typography>
                      ) : null}
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      识别结果：类型「{TYPE_LABEL[result?.intent.type ?? 'auto'] ?? '全部'}」· 维度「
                      {BY_OPTIONS.find((o) => o.value === result?.intent.by)?.label ?? result?.intent.by}」· 关键词「
                      {result?.intent.keyword || '—'}」
                    </Typography>
                    {result?.hint && (
                      <Typography variant="body2" sx={{ color: mm.warning, fontWeight: 600, mb: 1.5 }}>
                        提示：{result.hint}
                      </Typography>
                    )}
                    {result?.error && (
                      <Typography variant="body2" sx={{ color: mm.danger, fontWeight: 600, mb: 1.5 }}>
                        异常：{result.error}
                      </Typography>
                    )}
                    <Stack spacing={2}>
                      {groups.map((g) => (
                        <Box key={`${g.type}-${g.label}`}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {g.label}
                            </Typography>
                            {g.person && (
                              <Chip
                                size="small"
                                color="primary"
                                label={`${g.person.role === 'director' ? '导演' : '演员'}：${g.person.name}`}
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {g.candidates.length} 条候选
                              {typeof g.total === 'number' ? ` / 共 ${g.total}` : ''}
                            </Typography>
                          </Stack>
                          {g.error && (
                            <Typography variant="caption" sx={{ color: mm.danger, fontWeight: 600 }}>
                              数据源异常：{g.error}
                            </Typography>
                          )}
                          {g.hint && (
                            <Typography variant="caption" color="text.secondary">
                              {g.hint}
                            </Typography>
                          )}
                          {g.candidates.length > 0 && (
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                                gap: 1.5,
                              }}
                            >
                              {g.candidates.map(renderCandidate)}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              );
            })}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                {agentAvatar}
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: TAIL_LEFT,
                    bgcolor: 'var(--mm-sunken)',
                    boxShadow: 'var(--mm-sunken-sm)',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: 0,
                        bgcolor: 'var(--mm-text-3)',
                        animation: 'mm-scale-in 900ms var(--mm-ease) infinite alternate',
                        animationDelay: `${i * 160}ms`,
                      }}
                    />
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    Agent 正在思考并检索数据源…
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Card>

      <Card sx={{ p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack spacing={2}>
          {selectedList.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                borderRadius: 'var(--mm-radius)',
                bgcolor: 'var(--mm-sunken)',
                boxShadow: 'var(--mm-sunken-sm)',
              }}
            >
              <CheckCircleRoundedIcon sx={{ color: mm.success, fontSize: 22 }} />
              <Typography variant="body2" fontWeight={700}>
                已选 {selectedList.length} 条，等待确认入库
              </Typography>
              <Typography variant="caption" color="text.secondary">
                仅入库元数据，媒体本体请在对应列表页自行上传
              </Typography>
            </Box>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder="例如：我想要周杰伦的歌 / 帮我找电影 星际穿越 / 有没有刘慈欣写的书"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<SendRoundedIcon />}
              onClick={send}
              disabled={loading}
              sx={{ minWidth: 110, height: 40 }}
            >
              发送
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadRoundedIcon />}
              onClick={doImport}
              disabled={importing || selectedList.length === 0}
              sx={{ minWidth: 150, height: 40 }}
            >
              批量入库{selectedList.length > 0 ? `（${selectedList.length}）` : ''}
            </Button>
            <Button
              variant="text"
              startIcon={<AutorenewRoundedIcon />}
              onClick={newSession}
              disabled={messages.length === 0 && !sessionId}
              sx={{ minWidth: 110, height: 40 }}
            >
              新会话
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}

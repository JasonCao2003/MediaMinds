'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import {
  agentQueryService,
  agentImportService,
  type AgentCandidate,
  type AgentQueryResult,
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

const keyOf = (c: AgentCandidate) => `${c.source}:${c.sourceId}`;

export default function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [type, setType] = useState('auto');
  const [by, setBy] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Record<string, AgentCandidate>>({});
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `m-${Date.now()}-${seq.current}`;
  };

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
      const res = await agentQueryService({ message: text, type, by });
      setMessages((prev) => [...prev, { id: nextId(), role: 'agent', result: res.data }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'agent', text: '检索失败，请稍后重试。' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, type, by]);

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
      else toast.error(`入库失败${fail > 0 ? `（${fail} 条）` : ''}，请确认当前账号具备管理员权限`);
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

  const renderCandidate = (c: AgentCandidate) => {
    const k = keyOf(c);
    const checked = Boolean(selected[k]);
    return (
      <Card
        key={k}
        variant="outlined"
        onClick={() => toggleSelect(c)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          p: 1,
          cursor: 'pointer',
          borderColor: checked ? 'primary.main' : undefined,
          bgcolor: checked ? 'rgba(124,127,242,.10)' : 'transparent',
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
          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
            {c.rate.toFixed(1)}
          </Typography>
        )}
        <Chip size="small" label={SOURCE_LABEL[c.source] ?? c.source} />
      </Card>
    );
  };

  return (
    <Box>
      <PageHeader
        title="智能入库"
        subtitle="用自然语言描述你想要的视频 / 图书 / 音乐，Agent 检索并结构化后入库元信息"
        icon={<AutoAwesomeRoundedIcon />}
      />

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            数据源：酷狗音乐 · TMDB · 豆瓣图书
          </Typography>
        </Stack>
      </Card>

      <Card
        sx={{
          p: 2.5,
          mb: 2,
          minHeight: 320,
          maxHeight: '56vh',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 64 }} />}
            title="告诉我你想要什么"
            description="例如：我想要周杰伦的歌 / 帮我找电影 星际穿越 / 有没有刘慈欣写的书 / 汤姆·汉克斯主演的影片"
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
                        borderRadius: '18px 18px 4px 18px',
                        bgcolor: 'primary.main',
                        color: '#fff',
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
                  <Box key={m.id} sx={{ display: 'flex' }}>
                    <Box
                      sx={{
                        maxWidth: '78%',
                        px: 2,
                        py: 1.25,
                        borderRadius: '18px 18px 18px 4px',
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {m.text}
                    </Box>
                  </Box>
                );
              }
              const result = m.result;
              return (
                <Box key={m.id}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    识别结果：类型「{TYPE_LABEL[result?.intent.type ?? 'auto'] ?? '全部'}」· 维度「
                    {BY_OPTIONS.find((o) => o.value === result?.intent.by)?.label ?? result?.intent.by}」· 关键词「
                    {result?.intent.keyword || '—'}」
                  </Typography>
                  {result?.hint && (
                    <Typography variant="body2" color="warning.main" sx={{ mb: 1.5 }}>
                      {result.hint}
                    </Typography>
                  )}
                  <Stack spacing={2}>
                    {result?.groups.map((g) => (
                      <Box key={`${g.type}-${g.source}`}>
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
                          <Typography variant="caption" color="error.main">
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
              );
            })}
            {loading && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Agent 正在检索数据源…
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
      </Card>

      <Card sx={{ p: 2 }}>
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
        </Stack>
      </Card>
    </Box>
  );
}

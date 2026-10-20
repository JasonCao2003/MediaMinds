'use client';

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import type { TextAnalysisResult } from '@/api/agent';

/**
 * Agent 文本分析结果弹窗（歌词情感 / 阅读选段共用）。
 *
 * <p>展示引擎、模型、情感标签与正文；规则兜底时把降级原因放在提示条里，
 * 不把「未配置大模型」误当成分析失败。
 */
export default function AgentAnalysisDialog({
  open,
  title,
  loading,
  result,
  error,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  result: TextAnalysisResult | null;
  error?: string | null;
  onClose: () => void;
}) {
  const isLlm = result?.engine === 'langchain4j';

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
            <CircularProgress />
            <Typography color="text.secondary">Agent 正在阅读文本…</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : result ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label={isLlm ? `LangChain4j${result.model ? ` · ${result.model}` : ''}` : '规则分析'}
                variant="outlined"
              />
              {result.sentiment && <Chip label={result.sentiment} color="primary" variant="outlined" />}
            </Stack>

            {result.error && <Alert severity="info">{result.error}</Alert>}

            {result.summary && (
              <Typography variant="subtitle1" fontWeight={800}>
                {result.summary}
              </Typography>
            )}

            {result.analysis && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
              >
                {result.analysis}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography color="text.secondary">没有拿到分析结果。</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
